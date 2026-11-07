// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProoflyKYCRegistry, IProoflyKYCRegistry, Unauthorized, InvalidAddress} from "../src/ProoflyKYCRegistry.sol";

contract ProoflyKYCRegistryTest is Test {
    ProoflyKYCRegistry public registry;

    address public admin = address(0xAA1);
    address public operator = address(0xBB2);
    address public freelancer = address(0xCC3);
    address public financier1 = address(0xDD4);
    address public financier2 = address(0xEE5);
    address public randomUser = address(0xFF6);

    event KycStatusUpdated(address indexed account, bool indexed isVerified, uint256 timestamp);

    function setUp() public {
        vm.prank(admin);
        registry = new ProoflyKYCRegistry(admin);

        vm.prank(admin);
        registry.setOperator(operator, true);
    }

    function test_InitialAdminIsOperator() public view {
        assertEq(registry.admin(), admin);
        assertTrue(registry.operators(admin));
        assertTrue(registry.operators(operator));
        assertFalse(registry.operators(randomUser));
    }

    function test_SetKycStatusSingle() public {
        assertFalse(registry.isKycVerified(freelancer));

        vm.expectEmit(true, true, false, true);
        emit KycStatusUpdated(freelancer, true, block.timestamp);

        vm.prank(operator);
        registry.setKycStatus(freelancer, true);

        assertTrue(registry.isKycVerified(freelancer));

        // Revocar
        vm.prank(operator);
        registry.setKycStatus(freelancer, false);
        assertFalse(registry.isKycVerified(freelancer));
    }

    function test_SetBatchKycStatus() public {
        address[] memory accounts = new address[](3);
        accounts[0] = freelancer;
        accounts[1] = financier1;
        accounts[2] = financier2;

        vm.prank(operator);
        registry.setBatchKycStatus(accounts, true);

        assertTrue(registry.isKycVerified(freelancer));
        assertTrue(registry.isKycVerified(financier1));
        assertTrue(registry.isKycVerified(financier2));
    }

    function test_UnauthorizedCannotSetKyc() public {
        vm.prank(randomUser);
        vm.expectRevert(Unauthorized.selector);
        registry.setKycStatus(freelancer, true);
    }

    function test_RevertOnZeroAddress() public {
        vm.prank(operator);
        vm.expectRevert(InvalidAddress.selector);
        registry.setKycStatus(address(0), true);

        vm.prank(admin);
        vm.expectRevert(InvalidAddress.selector);
        registry.setOperator(address(0), true);
    }

    function test_AdminCanRevokeOperator() public {
        vm.prank(admin);
        registry.setOperator(operator, false);
        assertFalse(registry.operators(operator));

        vm.prank(operator);
        vm.expectRevert(Unauthorized.selector);
        registry.setKycStatus(freelancer, true);
    }
}

