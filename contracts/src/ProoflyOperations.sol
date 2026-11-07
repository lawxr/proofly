// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IProoflyKYCRegistry} from "./ProoflyKYCRegistry.sol";

error OperationAlreadyRegistered(bytes32 canonicalHmac);
error OperationNotFound(uint256 tokenId);
error InvalidOperationState(uint8 current, uint8 expected);
error KycVerificationRequired(address account);
error ArrayLengthMismatch();
error ZeroAmount();
error Unauthorized();

contract ProoflyOperations {
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

    address public admin;
    IProoflyKYCRegistry public immutable kycRegistry;
    uint256 public nextTokenId = 1;

    mapping(address => bool) public operators;
    mapping(address => bool) public reconcilers;
    mapping(bytes32 => bool) public isHmacRegistered;
    mapping(uint256 => OperationRecord) public operations;
    mapping(uint256 => mapping(address => uint256)) public balances;

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

    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != admin) revert Unauthorized();
        _;
    }

    modifier onlyReconciler() {
        if (!reconcilers[msg.sender] && msg.sender != admin) revert Unauthorized();
        _;
    }

    constructor(address initialAdmin, address kycRegistryAddress) {
        if (initialAdmin == address(0) || kycRegistryAddress == address(0)) revert("Invalid address");
        admin = initialAdmin;
        operators[initialAdmin] = true;
        reconcilers[initialAdmin] = true;
        kycRegistry = IProoflyKYCRegistry(kycRegistryAddress);
    }

    function setOperator(address operator, bool isAllowed) external onlyAdmin {
        if (operator == address(0)) revert("Invalid address");
        operators[operator] = isAllowed;
    }

    function setReconciler(address reconciler, bool isAllowed) external onlyAdmin {
        if (reconciler == address(0)) revert("Invalid address");
        reconcilers[reconciler] = isAllowed;
    }

    function mintOperation(
        bytes32 canonicalHmac,
        bytes32 dossierHash,
        uint256 nominalAmountCents,
        uint256 dueDateUnix,
        address[] calldata financiers,
        uint256[] calldata shares
    ) external onlyOperator returns (uint256 tokenId) {
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
            balances[tokenId][financier] += share;
            emit TransferSingle(msg.sender, address(0), financier, tokenId, share);

            unchecked { ++i; }
        }

        if (totalMinted != nominalAmountCents) revert("Total shares do not equal nominal amount");

        emit OperationMinted(tokenId, canonicalHmac, dossierHash, nominalAmountCents, dueDateUnix);
    }

    function settleOperation(
        uint256 tokenId,
        bytes32 settlementProofHash,
        uint256 receivedAmountCents
    ) external onlyReconciler {
        OperationRecord storage op = operations[tokenId];
        if (op.nominalAmountCents == 0) revert OperationNotFound(tokenId);
        if (op.state != OperationState.Funded && op.state != OperationState.OverduePartial) {
            revert InvalidOperationState(uint8(op.state), uint8(OperationState.Funded));
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

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount
    ) external {
        if (msg.sender != from) revert Unauthorized();
        if (!kycRegistry.isKycVerified(from)) revert KycVerificationRequired(from);
        if (!kycRegistry.isKycVerified(to)) revert KycVerificationRequired(to);
        if (balances[id][from] < amount) revert("Insufficient balance");

        balances[id][from] -= amount;
        balances[id][to] += amount;

        emit TransferSingle(msg.sender, from, to, id, amount);
    }
}

