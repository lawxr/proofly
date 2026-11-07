# Especificación de Contratos Inteligentes (Base L2) — Proofly (`docs/architecture/09-smart-contract-spec.md`)

Este documento especifica la arquitectura, interfaces, control de acceso y lógica interna de los contratos inteligentes de **Proofly**, desarrollados en **Solidity 0.8.24+** con **Foundry** para su despliegue en la red **Base (L2 de Ethereum)**:
1. `ProoflyKYCRegistry.sol`: Control de acceso y lista blanca de direcciones autorizadas.
2. `ProoflyOperations.sol`: Contrato ERC-1155 restringido que representa las participaciones fraccionadas de cada operación, el registro de dossiers hasheados y la liquidación irrevocable.

---

## 1. Contrato 1: `ProoflyKYCRegistry.sol`

### 1.1. Responsabilidad e Invariantes
Garantiza el estricto cumplimiento de la **Invariante I7 (Transferencias Restringidas por Cumplimiento)**. Ninguna dirección puede recibir o transferir participaciones de una operación sin estar previamente registrada y activa en este contrato.

### 1.2. Interfaz y Código de Especificación
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlDefaultAdminRules} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";

error AddressNotVerified(address account);
error InvalidAddress();

interface IProoflyKYCRegistry {
    event KycStatusUpdated(address indexed account, bool indexed isVerified, uint256 timestamp);

    function isKycVerified(address account) external view returns (bool);
    function setKycStatus(address account, bool isVerified) external;
    function setBatchKycStatus(address[] calldata accounts, bool isVerified) external;
}

contract ProoflyKYCRegistry is AccessControlDefaultAdminRules, IProoflyKYCRegistry {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    mapping(address => bool) private _verifiedAddresses;

    constructor(address initialAdmin) 
        AccessControlDefaultAdminRules(3 days, initialAdmin) 
    {
        if (initialAdmin == address(0)) revert InvalidAddress();
        _grantRole(OPERATOR_ROLE, initialAdmin);
    }

    function isKycVerified(address account) external view override returns (bool) {
        return _verifiedAddresses[account];
    }

    function setKycStatus(address account, bool isVerified) external override onlyRole(OPERATOR_ROLE) {
        if (account == address(0)) revert InvalidAddress();
        _verifiedAddresses[account] = isVerified;
        emit KycStatusUpdated(account, isVerified, block.timestamp);
    }

    function setBatchKycStatus(address[] calldata accounts, bool isVerified) external override onlyRole(OPERATOR_ROLE) {
        uint256 length = accounts.length;
        for (uint256 i = 0; i < length; ) {
            address account = accounts[i];
            if (account == address(0)) revert InvalidAddress();
            _verifiedAddresses[account] = isVerified;
            emit KycStatusUpdated(account, isVerified, block.timestamp);
            unchecked { ++i; }
        }
    }
}
```

---

## 2. Contrato 2: `ProoflyOperations.sol` (ERC-1155 Restringido)

### 2.1. Responsabilidad y Mecánica
Cada operación financiada (factura o hito) se representa como un token ID único en el estándar ERC-1155:
- **`Token ID`:** Identificador numérico secuencial que mapea a una clave `canonicalHmac` y a un dossier documental hasheado.
- **`Supply`:** El suministro total de tokens de una operación equivale exactamente al **Valor Nominal en Centavos ($V_n$)**. Cada token de balance `1` representa $1 \text{ centavo de COP}$ de derechos económicos al vencimiento.
- **Hook `_update`:** Sobrescrito para validar que tanto el remitente como el destinatario posean KYC activo antes de permitir cualquier transferencia, impidiendo mercados secundarios no regulados.

### 2.2. Máquina de Estados en Solidity
```solidity
enum OperationState {
    Draft,                      // 0
    PendingConfirmation,        // 1
    PendingVerification,         // 2
    Quoted,                     // 3
    OpenForFunding,             // 4
    Funded,                     // 5
    Disbursed,                  // 6
    Settled,                    // 7
    OverduePartial,             // 8
    Cancelled                   // 9
}
```

### 2.3. Código de Especificación del Contrato
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControlDefaultAdminRules} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {IProoflyKYCRegistry} from "./ProoflyKYCRegistry.sol";

error OperationAlreadyRegistered(bytes32 canonicalHmac);
error OperationNotFound(uint256 tokenId);
error InvalidOperationState(OperationState current, OperationState expected);
error KycVerificationRequired(address account);
error ArrayLengthMismatch();
error ZeroAmount();

contract ProoflyOperations is ERC1155, AccessControlDefaultAdminRules {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant RECONCILER_ROLE = keccak256("RECONCILER_ROLE");

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

    constructor(
        address initialAdmin,
        address kycRegistryAddress,
        string memory baseUri
    ) 
        ERC1155(baseUri)
        AccessControlDefaultAdminRules(3 days, initialAdmin)
    {
        if (kycRegistryAddress == address(0)) revert("Invalid KYC registry");
        kycRegistry = IProoflyKYCRegistry(kycRegistryAddress);
        _grantRole(OPERATOR_ROLE, initialAdmin);
        _grantRole(RECONCILER_ROLE, initialAdmin);
    }

    /// @notice Mintea las participaciones de una operación fondeada a los financiadores autorizados
    function mintOperation(
        bytes32 canonicalHmac,
        bytes32 dossierHash,
        uint256 nominalAmountCents,
        uint256 dueDateUnix,
        address[] calldata financiers,
        uint256[] calldata shares
    ) external onlyRole(OPERATOR_ROLE) returns (uint256 tokenId) {
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
            address financier = financiers[i];
            uint256 share = shares[i];
            
            if (!kycRegistry.isKycVerified(financier)) revert KycVerificationRequired(financier);
            totalMinted += share;
            _mint(financier, tokenId, share, "");
            
            unchecked { ++i; }
        }

        if (totalMinted != nominalAmountCents) revert("Total shares do not equal nominal amount");

        emit OperationMinted(tokenId, canonicalHmac, dossierHash, nominalAmountCents, dueDateUnix);
    }

    /// @notice Registra el recaudo bancario y liquida/quema las participaciones on-chain
    function settleOperation(
        uint256 tokenId,
        bytes32 settlementProofHash,
        uint256 receivedAmountCents
    ) external onlyRole(RECONCILER_ROLE) {
        OperationRecord storage op = operations[tokenId];
        if (op.nominalAmountCents == 0) revert OperationNotFound(tokenId);
        if (op.state != OperationState.Funded && op.state != OperationState.OverduePartial) {
            revert InvalidOperationState(op.state, OperationState.Funded);
        }

        op.settlementProofHash = settlementProofHash;
        op.settledAmountCents += receivedAmountCents;

        if (op.settledAmountCents >= op.nominalAmountCents) {
            op.state = OperationState.Settled;
        } else {
            op.state = OperationState.OverduePartial;
        }

        emit OperationSettled(tokenId, settlementProofHash, receivedAmountCents, op.state);
    }

    /// @dev Hook OpenZeppelin v5 que restringe cualquier transferencia a billeteras con KYC activo
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        super._update(from, to, ids, values);

        // Si no es minting (from != 0), validar que el remitente tenga KYC activo
        if (from != address(0) && !kycRegistry.isKycVerified(from)) {
            revert KycVerificationRequired(from);
        }

        // Si no es burning (to != 0), validar que el receptor tenga KYC activo
        if (to != address(0) && !kycRegistry.isKycVerified(to)) {
            revert KycVerificationRequired(to);
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, AccessControlDefaultAdminRules)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

---

## 3. Invariantes Comprobables en Foundry (Fuzzing)

1. **Invariante de Suministro:** $\sum \text{balances}(TokenId) \equiv \text{nominalAmountCents}$.
2. **Invariante Anti-Duplicado:** Es imposible invocar `mintOperation` dos veces con el mismo `canonicalHmac`.
3. **Invariante de Cumplimiento KYC:** Es imposible que `transferFrom` o `safeTransferFrom` tenga éxito si el remitente o el receptor son desactivados en `ProoflyKYCRegistry`.
4. **Invariante de Liquidación:** Solo cuentas con `RECONCILER_ROLE` pueden invocar `settleOperation`.

