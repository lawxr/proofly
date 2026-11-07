// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProoflyKYCRegistry} from "../src/ProoflyKYCRegistry.sol";
import {
    ProoflyOperations,
    OperationAlreadyRegistered,
    OperationNotFound,
    InvalidOperationState,
    KycVerificationRequired,
    ArrayLengthMismatch,
    ZeroAmount,
    Unauthorized
} from "../src/ProoflyOperations.sol";

contract ProoflyOperationsTest is Test {
    ProoflyKYCRegistry public kyc;
    ProoflyOperations public operations;

    address public admin = address(0xAA1);
    address public operator = address(0xBB2);
    address public reconciler = address(0xCC3);
    address public financier1 = address(0xDD4);
    address public financier2 = address(0xEE5);
    address public nonKycUser = address(0xFF6);

    bytes32 public testHmac = 0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff;
    bytes32 public testDossierHash = 0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899;

    function setUp() public {
        vm.startPrank(admin);
        kyc = new ProoflyKYCRegistry(admin);
        operations = new ProoflyOperations(admin, address(kyc));

        operations.setOperator(operator, true);
        operations.setReconciler(reconciler, true);

        kyc.setKycStatus(financier1, true);
        kyc.setKycStatus(financier2, true);
        vm.stopPrank();
    }

    function test_MintOperationSuccess() public {
        address[] memory financiers = new address[](2);
        financiers[0] = financier1;
        financiers[1] = financier2;

        uint256[] memory shares = new uint256[](2);
        shares[0] = 60000000; // $ 600.000 COP
        shares[1] = 40000000; // $ 400.000 COP
        uint256 nominalAmountCents = 100000000; // $ 1.000.000 COP

        vm.prank(operator);
        uint256 tokenId = operations.mintOperation(
            testHmac,
            testDossierHash,
            nominalAmountCents,
            block.timestamp + 30 days,
            financiers,
            shares
        );

        assertEq(tokenId, 1);
        assertEq(operations.balances(tokenId, financier1), 60000000);
        assertEq(operations.balances(tokenId, financier2), 40000000);
        assertTrue(operations.isHmacRegistered(testHmac));
    }

    function test_MintRevertsIfFinancierLacksKyc() public {
        address[] memory financiers = new address[](1);
        financiers[0] = nonKycUser;

        uint256[] memory shares = new uint256[](1);
        shares[0] = 100000000;

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(KycVerificationRequired.selector, nonKycUser));
        operations.mintOperation(
            testHmac,
            testDossierHash,
            100000000,
            block.timestamp + 30 days,
            financiers,
            shares
        );
    }

    function test_MintRevertsOnDuplicateHmac() public {
        address[] memory financiers = new address[](1);
        financiers[0] = financier1;

        uint256[] memory shares = new uint256[](1);
        shares[0] = 100000000;

        vm.startPrank(operator);
        operations.mintOperation(
            testHmac,
            testDossierHash,
            100000000,
            block.timestamp + 30 days,
            financiers,
            shares
        );

        // Segundo intento con mismo HMAC debe fallar (Invariante I4 / I5)
        vm.expectRevert(abi.encodeWithSelector(OperationAlreadyRegistered.selector, testHmac));
        operations.mintOperation(
            testHmac,
            testDossierHash,
            100000000,
            block.timestamp + 30 days,
            financiers,
            shares
        );
        vm.stopPrank();
    }

    function test_MintRevertsIfSharesDoNotEqualNominal() public {
        address[] memory financiers = new address[](1);
        financiers[0] = financier1;

        uint256[] memory shares = new uint256[](1);
        shares[0] = 99999999; // 1 centavo menos

        vm.prank(operator);
        vm.expectRevert("Total shares do not equal nominal amount");
        operations.mintOperation(
            testHmac,
            testDossierHash,
            100000000,
            block.timestamp + 30 days,
            financiers,
            shares
        );
    }

    function test_SettleOperationFull() public {
        address[] memory financiers = new address[](1);
        financiers[0] = financier1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 100000000;

        vm.prank(operator);
        uint256 tokenId = operations.mintOperation(
            testHmac,
            testDossierHash,
            100000000,
            block.timestamp + 30 days,
            financiers,
            shares
        );

        bytes32 receiptHash = keccak256("banco_receipt_123");
        vm.prank(reconciler);
        operations.settleOperation(tokenId, receiptHash, 100000000);

        (,,,, ProoflyOperations.OperationState state, uint256 settled, bytes32 proof) = operations.operations(tokenId);
        assertEq(uint8(state), uint8(ProoflyOperations.OperationState.Settled));
        assertEq(settled, 100000000);
        assertEq(proof, receiptHash);
    }

    function test_SettleOperationPartial() public {
        address[] memory financiers = new address[](1);
        financiers[0] = financier1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 100000000;

        vm.prank(operator);
        uint256 tokenId = operations.mintOperation(
            testHmac,
            testDossierHash,
            100000000,
            block.timestamp + 30 days,
            financiers,
            shares
        );

        bytes32 receiptHash = keccak256("banco_partial_receipt");
        vm.prank(reconciler);
        operations.settleOperation(tokenId, receiptHash, 60000000);

        (,,,, ProoflyOperations.OperationState state, uint256 settled,) = operations.operations(tokenId);
        assertEq(uint8(state), uint8(ProoflyOperations.OperationState.OverduePartial));
        assertEq(settled, 60000000);
    }

    function test_TransferRevertsIfRecipientLacksKyc() public {
        address[] memory financiers = new address[](1);
        financiers[0] = financier1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 100000000;

        vm.prank(operator);
        uint256 tokenId = operations.mintOperation(
            testHmac,
            testDossierHash,
            100000000,
            block.timestamp + 30 days,
            financiers,
            shares
        );

        vm.prank(financier1);
        vm.expectRevert(abi.encodeWithSelector(KycVerificationRequired.selector, nonKycUser));
        operations.safeTransferFrom(financier1, nonKycUser, tokenId, 10000000);
    }

    function test_TransferSucceedsBetweenKycAccounts() public {
        address[] memory financiers = new address[](1);
        financiers[0] = financier1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 100000000;

        vm.prank(operator);
        uint256 tokenId = operations.mintOperation(
            testHmac,
            testDossierHash,
            100000000,
            block.timestamp + 30 days,
            financiers,
            shares
        );

        vm.prank(financier1);
        operations.safeTransferFrom(financier1, financier2, tokenId, 30000000);

        assertEq(operations.balances(tokenId, financier1), 70000000);
        assertEq(operations.balances(tokenId, financier2), 30000000);
    }

    // --- Pruebas de Fuzzing (Invariantes) ---

    function testFuzz_CannotDoubleMintHmac(bytes32 hmac) public {
        vm.assume(hmac != bytes32(0));

        address[] memory financiers = new address[](1);
        financiers[0] = financier1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 100000000;

        vm.startPrank(operator);
        operations.mintOperation(
            hmac,
            testDossierHash,
            100000000,
            block.timestamp + 30 days,
            financiers,
            shares
        );

        vm.expectRevert(abi.encodeWithSelector(OperationAlreadyRegistered.selector, hmac));
        operations.mintOperation(
            hmac,
            testDossierHash,
            100000000,
            block.timestamp + 30 days,
            financiers,
            shares
        );
        vm.stopPrank();
    }

    function testFuzz_ConservationOfSupplyOnTransfer(uint64 amount) public {
        uint256 totalNominal = 100000000; // 1M COP
        vm.assume(amount > 0 && amount <= totalNominal);

        address[] memory financiers = new address[](1);
        financiers[0] = financier1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = totalNominal;

        vm.prank(operator);
        uint256 tokenId = operations.mintOperation(
            keccak256(abi.encode(amount)),
            testDossierHash,
            totalNominal,
            block.timestamp + 30 days,
            financiers,
            shares
        );

        vm.prank(financier1);
        operations.safeTransferFrom(financier1, financier2, tokenId, amount);

        uint256 bal1 = operations.balances(tokenId, financier1);
        uint256 bal2 = operations.balances(tokenId, financier2);

        assertEq(bal1 + bal2, totalNominal);
    }
}

