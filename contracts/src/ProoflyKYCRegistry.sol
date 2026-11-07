// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

error AddressNotVerified(address account);
error InvalidAddress();
error Unauthorized();

interface IProoflyKYCRegistry {
    event KycStatusUpdated(address indexed account, bool indexed isVerified, uint256 timestamp);

    function isKycVerified(address account) external view returns (bool);
    function setKycStatus(address account, bool isVerified) external;
    function setBatchKycStatus(address[] calldata accounts, bool isVerified) external;
}

contract ProoflyKYCRegistry is IProoflyKYCRegistry {
    address public admin;
    mapping(address => bool) public operators;
    mapping(address => bool) private _verifiedAddresses;

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != admin) revert Unauthorized();
        _;
    }

    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert InvalidAddress();
        admin = initialAdmin;
        operators[initialAdmin] = true;
    }

    function isKycVerified(address account) external view override returns (bool) {
        return _verifiedAddresses[account];
    }

    function setKycStatus(address account, bool isVerified) external override onlyOperator {
        if (account == address(0)) revert InvalidAddress();
        _verifiedAddresses[account] = isVerified;
        emit KycStatusUpdated(account, isVerified, block.timestamp);
    }

    function setBatchKycStatus(address[] calldata accounts, bool isVerified) external override onlyOperator {
        uint256 length = accounts.length;
        for (uint256 i = 0; i < length; ) {
            address account = accounts[i];
            if (account == address(0)) revert InvalidAddress();
            _verifiedAddresses[account] = isVerified;
            emit KycStatusUpdated(account, isVerified, block.timestamp);
            unchecked { ++i; }
        }
    }

    function setOperator(address operator, bool isAllowed) external onlyAdmin {
        if (operator == address(0)) revert InvalidAddress();
        operators[operator] = isAllowed;
    }
}

