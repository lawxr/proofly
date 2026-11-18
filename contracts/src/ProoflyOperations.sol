// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IProoflyKYCRegistry} from "./ProoflyKYCRegistry.sol";

error OperationAlreadyRegistered(bytes32 canonicalHmac);
error OperationNotFound(uint256 tokenId);
error InvalidOperationState(uint8 current, uint8 expected);
error KycVerificationRequired(address account);
error ArrayLengthMismatch();
error ZeroAmount();
error SharesDoNotEqualNominal(uint256 totalShares, uint256 nominalAmountCents);
error Unauthorized();
error OperationNotOpen(uint256 tokenId);
error InvalidUsdcAmount(uint256 amountUsdc);
error NothingToClaim();
error SettlementNotFunded();
error FundingExceedsRemaining(uint256 remainingCents, uint256 requestedCents);
error InsufficientSettlement(uint256 receivedUsdc, uint256 fundedUsdc);
error VaultSettlementRequired(uint256 tokenId);

/**
 * @title ProoflyOperations
 * @notice ERC-1155 real (OpenZeppelin v5) donde cada tokenId representa una
 *         operación financiada y el balance de cada dirección son los centavos
 *         de COP (participación) que ese financiador posee en la operación.
 *
 * Lógica de dominio preservada sobre el estándar:
 *  - Anti-duplicado por HMAC canónico (Invariante I5): un HMAC se mintea una vez.
 *  - Emisión con respaldo total (Invariante I6): suma de shares == nominalAmountCents.
 *  - Estados de operación y cascada de recaudo (settleOperation).
 *  - Transferencias restringidas a KYC (Invariante I7): se aplica en el hook
 *    _update, que cubre mint, transfer y batch. El mint (from == address(0)) se
 *    permite para que el operador pueda emitir; el gating KYC recae sobre el
 *    receptor en todos los casos.
 */
contract ProoflyOperations is ERC1155, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Demo fixed rate: 1 mUSDC = 4,000 COP.
    uint256 public constant COP_CENTS_PER_USDC = 400_000;
    uint256 public constant USDC_DECIMALS = 1_000_000;

    enum OperationState {
        Draft,
        PendingConfirmation,
        PendingVerification,
        Quoted,
        OpenForFunding,
        Funded,
        Disbursed,
        Settled,
        OverduePartial,
        Cancelled
    }

    struct OperationRecord {
        bytes32 canonicalHmac;
        bytes32 dossierHash;
        uint256 nominalAmountCents;
        uint256 dueDateUnix;
        OperationState state;
        uint256 settledAmountCents;
        bytes32 settlementProofHash;
    }

    IProoflyKYCRegistry public immutable kycRegistry;
    IERC20 public immutable mockUsdc;
    uint256 public nextTokenId = 1;

    mapping(address => bool) public operators;
    mapping(address => bool) public reconcilers;
    mapping(bytes32 => bool) public isHmacRegistered;
    mapping(uint256 => OperationRecord) public operations;
    mapping(bytes32 => uint256) public hmacToTokenId;
    mapping(uint256 => uint256) public fundedCentsByOperation;
    mapping(uint256 => uint256) public fundedUsdcByOperation;
    mapping(uint256 => uint256) public settlementPoolUsdcByOperation;
    mapping(uint256 => mapping(address => uint256)) public claimedUsdcByOperation;
    /// @notice Shares (COP cents) already burned by claims, per operation.
    mapping(uint256 => uint256) public claimedSharesByOperation;
    /// @notice mUSDC units already paid by claims, per operation.
    mapping(uint256 => uint256) public totalClaimedUsdcByOperation;

    event OperationMinted(
        uint256 indexed tokenId,
        bytes32 indexed canonicalHmac,
        bytes32 dossierHash,
        uint256 nominalAmountCents,
        uint256 dueDateUnix
    );

    event OperationSettled(
        uint256 indexed tokenId,
        bytes32 indexed settlementProofHash,
        uint256 settledAmountCents,
        OperationState newState
    );

    event OperationOpened(uint256 indexed tokenId, bytes32 indexed canonicalHmac, uint256 nominalAmountCents);
    event OperationDeposited(uint256 indexed tokenId, address indexed financier, uint256 amountUsdc, uint256 sharesCents);
    event SettlementFunded(uint256 indexed tokenId, uint256 amountUsdc);
    event CapitalClaimed(uint256 indexed tokenId, address indexed financier, uint256 amountUsdc);

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) revert Unauthorized();
        _;
    }

    modifier onlyReconciler() {
        if (!reconcilers[msg.sender] && msg.sender != owner()) revert Unauthorized();
        _;
    }

    /// @param initialAdmin dueño del contrato (operador y reconciliador inicial).
    /// @param kycRegistryAddress registro KYC que autoriza quién puede tener participaciones.
    constructor(address initialAdmin, address kycRegistryAddress, address mockUsdcAddress)
        ERC1155("https://proofly.co/operations/{id}.json")
        Ownable(initialAdmin)
    {
        if (kycRegistryAddress == address(0)) revert("Invalid address");
        if (mockUsdcAddress == address(0)) revert("Invalid address");
        mockUsdc = IERC20(mockUsdcAddress);
        operators[initialAdmin] = true;
        reconcilers[initialAdmin] = true;
        kycRegistry = IProoflyKYCRegistry(kycRegistryAddress);
    }

    function setOperator(address operator, bool isAllowed) external onlyOwner {
        if (operator == address(0)) revert("Invalid address");
        operators[operator] = isAllowed;
    }

    function setReconciler(address reconciler, bool isAllowed) external onlyOwner {
        if (reconciler == address(0)) revert("Invalid address");
        reconcilers[reconciler] = isAllowed;
    }

    function usdcToCopCents(uint256 amountUsdc) public pure returns (uint256 cents) {
        uint256 wholeUsdc = amountUsdc / USDC_DECIMALS;
        uint256 fractionUsdc = amountUsdc % USDC_DECIMALS;
        uint256 fractionCents = (fractionUsdc * COP_CENTS_PER_USDC) / USDC_DECIMALS;
        if ((fractionUsdc * COP_CENTS_PER_USDC) % USDC_DECIMALS != 0) revert InvalidUsdcAmount(amountUsdc);
        cents = wholeUsdc * COP_CENTS_PER_USDC + fractionCents;
        if (cents == 0) revert ZeroAmount();
    }

    function copCentsToUsdc(uint256 cents) public pure returns (uint256 amountUsdc) {
        uint256 wholeCop = cents / COP_CENTS_PER_USDC;
        uint256 fractionCop = cents % COP_CENTS_PER_USDC;
        uint256 fractionUsdc = (fractionCop * USDC_DECIMALS) / COP_CENTS_PER_USDC;
        if ((fractionCop * USDC_DECIMALS) % COP_CENTS_PER_USDC != 0) revert InvalidUsdcAmount(cents);
        amountUsdc = wholeCop * USDC_DECIMALS + fractionUsdc;
        if (amountUsdc == 0) revert ZeroAmount();
    }


    /**
     * @notice Abre una operación para fondeo con mUSDC. `nominalAmountCents` es
     *         la meta de fondeo en centavos COP (el adelanto que aportan los
     *         financiadores), no el valor facial de la factura.
     */
    function openOperation(
        bytes32 canonicalHmac,
        bytes32 dossierHash,
        uint256 nominalAmountCents,
        uint256 dueDateUnix
    ) external onlyOperator nonReentrant returns (uint256 tokenId) {
        if (isHmacRegistered[canonicalHmac]) revert OperationAlreadyRegistered(canonicalHmac);
        if (nominalAmountCents == 0) revert ZeroAmount();
        // La meta debe poder fondearse exactamente con unidades mínimas de mUSDC.
        copCentsToUsdc(nominalAmountCents);

        tokenId = nextTokenId++;
        isHmacRegistered[canonicalHmac] = true;
        hmacToTokenId[canonicalHmac] = tokenId;
        operations[tokenId] = OperationRecord({
            canonicalHmac: canonicalHmac,
            dossierHash: dossierHash,
            nominalAmountCents: nominalAmountCents,
            dueDateUnix: dueDateUnix,
            state: OperationState.OpenForFunding,
            settledAmountCents: 0,
            settlementProofHash: bytes32(0)
        });

        emit OperationOpened(tokenId, canonicalHmac, nominalAmountCents);
    }

    /**
     * @notice El financiador (KYC) deposita mUSDC y recibe ERC-1155 por los
     *         centavos COP equivalentes. No permite sobrefondeo.
     */
    function depositForOperation(
        bytes32 canonicalHmac,
        uint256 amountUsdc
    ) external nonReentrant returns (uint256 tokenId) {
        if (!kycRegistry.isKycVerified(msg.sender)) revert KycVerificationRequired(msg.sender);

        tokenId = hmacToTokenId[canonicalHmac];
        if (tokenId == 0) revert OperationNotFound(tokenId);

        OperationRecord storage op = operations[tokenId];
        if (op.state != OperationState.OpenForFunding) revert OperationNotOpen(tokenId);

        uint256 sharesCents = usdcToCopCents(amountUsdc);
        uint256 remainingCents = op.nominalAmountCents - fundedCentsByOperation[tokenId];
        if (sharesCents > remainingCents) revert FundingExceedsRemaining(remainingCents, sharesCents);

        // Efectos antes de interacciones (CEI); nonReentrant cubre el callback ERC-1155.
        fundedCentsByOperation[tokenId] += sharesCents;
        fundedUsdcByOperation[tokenId] += amountUsdc;
        if (fundedCentsByOperation[tokenId] == op.nominalAmountCents) {
            op.state = OperationState.Funded;
        }

        mockUsdc.safeTransferFrom(msg.sender, address(this), amountUsdc);
        _mint(msg.sender, tokenId, sharesCents, "");

        emit OperationDeposited(tokenId, msg.sender, amountUsdc, sharesCents);
    }

    /**
     * @notice Registra el recaudo de una operación fondeada. `receivedUsdc` es lo
     *         que corresponde a los financiadores (capital + ganancia), sin la
     *         comisión de Proofly. El capital ya está en el contrato; el
     *         reconciliador aporta solo la ganancia. Liquidación única y total.
     */
    function fundAndSettleOperation(
        uint256 tokenId,
        bytes32 settlementProofHash,
        uint256 receivedUsdc
    ) external onlyReconciler nonReentrant {
        OperationRecord storage op = operations[tokenId];
        if (op.nominalAmountCents == 0) revert OperationNotFound(tokenId);
        if (op.state != OperationState.Funded) {
            revert InvalidOperationState(uint8(op.state), uint8(OperationState.Funded));
        }
        uint256 fundedUsdc = fundedUsdcByOperation[tokenId];
        if (receivedUsdc < fundedUsdc) revert InsufficientSettlement(receivedUsdc, fundedUsdc);

        uint256 receivedCents = usdcToCopCents(receivedUsdc);
        uint256 profitUsdc = receivedUsdc - fundedUsdc;

        settlementPoolUsdcByOperation[tokenId] = profitUsdc;
        op.settlementProofHash = settlementProofHash;
        op.settledAmountCents = receivedCents;
        op.state = OperationState.Settled;

        if (profitUsdc > 0) {
            mockUsdc.safeTransferFrom(msg.sender, address(this), profitUsdc);
        }

        emit SettlementFunded(tokenId, receivedUsdc);
        emit OperationSettled(tokenId, settlementProofHash, receivedCents, op.state);
    }

    /**
     * @dev Monto que recibiría `shares` al reclamar. Pro-rata entero; quien
     *      completa el total de participaciones recibe el residuo de redondeo,
     *      de modo que la suma pagada es exactamente capital + ganancia.
     */
    function _claimAmount(uint256 tokenId, uint256 shares) internal view returns (uint256) {
        uint256 target = operations[tokenId].nominalAmountCents;
        uint256 total = fundedUsdcByOperation[tokenId] + settlementPoolUsdcByOperation[tokenId];
        if (claimedSharesByOperation[tokenId] + shares == target) {
            return total - totalClaimedUsdcByOperation[tokenId];
        }
        return total * shares / target;
    }

    function claimableUsdc(uint256 tokenId, address financier) public view returns (uint256) {
        OperationRecord storage op = operations[tokenId];
        if (op.nominalAmountCents == 0) return 0;
        if (op.state != OperationState.Settled) return 0;
        uint256 shares = balanceOf(financier, tokenId);
        if (shares == 0) return 0;
        return _claimAmount(tokenId, shares);
    }

    /**
     * @notice Retira capital + ganancia. Quema todas las participaciones del
     *         llamador, por lo que no puede reclamar dos veces.
     */
    function claimSettlement(uint256 tokenId) external nonReentrant {
        if (!kycRegistry.isKycVerified(msg.sender)) revert KycVerificationRequired(msg.sender);
        OperationRecord storage op = operations[tokenId];
        if (op.nominalAmountCents == 0) revert OperationNotFound(tokenId);
        if (op.state != OperationState.Settled) revert InvalidOperationState(uint8(op.state), uint8(OperationState.Settled));
        if (fundedUsdcByOperation[tokenId] == 0) revert SettlementNotFunded();

        uint256 shares = balanceOf(msg.sender, tokenId);
        if (shares == 0) revert NothingToClaim();

        uint256 amountUsdc = _claimAmount(tokenId, shares);
        if (amountUsdc == 0) revert NothingToClaim();

        claimedSharesByOperation[tokenId] += shares;
        totalClaimedUsdcByOperation[tokenId] += amountUsdc;
        claimedUsdcByOperation[tokenId][msg.sender] += amountUsdc;
        _burn(msg.sender, tokenId, shares);
        mockUsdc.safeTransfer(msg.sender, amountUsdc);

        emit CapitalClaimed(tokenId, msg.sender, amountUsdc);
    }

    /**
     * @notice Emite una operación: registra su HMAC y acuña a cada financiador
     *         su participación (centavos) como balance del tokenId.
     * @dev La suma de shares debe igualar el valor nominal (respaldo total).
     */
    function mintOperation(
        bytes32 canonicalHmac,
        bytes32 dossierHash,
        uint256 nominalAmountCents,
        uint256 dueDateUnix,
        address[] calldata financiers,
        uint256[] calldata shares
    ) external onlyOperator nonReentrant returns (uint256 tokenId) {
        if (isHmacRegistered[canonicalHmac]) revert OperationAlreadyRegistered(canonicalHmac);
        if (financiers.length != shares.length) revert ArrayLengthMismatch();
        if (nominalAmountCents == 0) revert ZeroAmount();

        tokenId = nextTokenId++;
        isHmacRegistered[canonicalHmac] = true;
        // Ambos caminos (mintOperation heredado y openOperation vault) comparten
        // el mismo índice HMAC -> tokenId; isHmacRegistered impide duplicarlos.
        hmacToTokenId[canonicalHmac] = tokenId;

        operations[tokenId] = OperationRecord({
            canonicalHmac: canonicalHmac,
            dossierHash: dossierHash,
            nominalAmountCents: nominalAmountCents,
            dueDateUnix: dueDateUnix,
            state: OperationState.Funded,
            settledAmountCents: 0,
            settlementProofHash: bytes32(0)
        });

        uint256 totalMinted = 0;
        for (uint256 i = 0; i < financiers.length; ) {
            // El gating KYC del receptor lo aplica el hook _update en cada _mint.
            _mint(financiers[i], tokenId, shares[i], "");
            totalMinted += shares[i];
            unchecked { ++i; }
        }

        if (totalMinted != nominalAmountCents) revert SharesDoNotEqualNominal(totalMinted, nominalAmountCents);

        emit OperationMinted(tokenId, canonicalHmac, dossierHash, nominalAmountCents, dueDateUnix);
    }

    /**
     * @notice Registra el recaudo bancario de una operación. Acumula el monto y
     *         transita a Settled (completo) o OverduePartial (parcial).
     */
    function settleOperation(
        uint256 tokenId,
        bytes32 settlementProofHash,
        uint256 receivedAmountCents
    ) external onlyReconciler nonReentrant {
        OperationRecord storage op = operations[tokenId];
        if (op.nominalAmountCents == 0) revert OperationNotFound(tokenId);
        // Una operación con mUSDC depositado solo se liquida con fundAndSettleOperation.
        if (fundedUsdcByOperation[tokenId] > 0) revert VaultSettlementRequired(tokenId);
        if (op.state != OperationState.Funded && op.state != OperationState.OverduePartial) {
            revert InvalidOperationState(uint8(op.state), uint8(OperationState.Funded));
        }

        op.settlementProofHash = settlementProofHash;
        op.settledAmountCents += receivedAmountCents;
        op.state = op.settledAmountCents >= op.nominalAmountCents
            ? OperationState.Settled
            : OperationState.OverduePartial;

        emit OperationSettled(tokenId, settlementProofHash, receivedAmountCents, op.state);
    }

    /**
     * @dev Hook único de ERC-1155 v5 para toda mutación de balances (mint,
     *      transfer, batch, burn). Exige KYC del receptor salvo en burn
     *      (to == address(0)) y KYC del emisor en transferencias entre cuentas.
     *      El retiro (claimSettlement) verifica KYC antes de quemar.
     */
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
    {
        if (to != address(0) && !kycRegistry.isKycVerified(to)) revert KycVerificationRequired(to);
        if (from != address(0) && to != address(0) && !kycRegistry.isKycVerified(from)) revert KycVerificationRequired(from);
        super._update(from, to, ids, values);
    }
}
