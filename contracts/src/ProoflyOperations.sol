// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IProoflyKYCRegistry} from "./ProoflyKYCRegistry.sol";

error OperationAlreadyRegistered(bytes32 canonicalHmac);
error OperationNotFound(uint256 tokenId);
error InvalidOperationState(uint8 current, uint8 expected);
error KycVerificationRequired(address account);
error ArrayLengthMismatch();
error ZeroAmount();
error SharesDoNotEqualNominal(uint256 totalShares, uint256 nominalAmountCents);
error Unauthorized();

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
    uint256 public nextTokenId = 1;

    mapping(address => bool) public operators;
    mapping(address => bool) public reconcilers;
    mapping(bytes32 => bool) public isHmacRegistered;
    mapping(uint256 => OperationRecord) public operations;

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
    constructor(address initialAdmin, address kycRegistryAddress)
        ERC1155("https://proofly.co/operations/{id}.json")
        Ownable(initialAdmin)
    {
        if (kycRegistryAddress == address(0)) revert("Invalid address");
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
     *      (to == address(0)). El emisor no necesita KYC para quemar.
     */
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
    {
        if (to != address(0) && !kycRegistry.isKycVerified(to)) revert KycVerificationRequired(to);
        super._update(from, to, ids, values);
    }
}
