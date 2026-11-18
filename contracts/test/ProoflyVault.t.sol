// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ProoflyKYCRegistry} from "../src/ProoflyKYCRegistry.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {
    ProoflyOperations,
    KycVerificationRequired,
    OperationNotFound,
    OperationNotOpen,
    OperationAlreadyRegistered,
    InvalidOperationState,
    InvalidUsdcAmount,
    FundingExceedsRemaining,
    InsufficientSettlement,
    VaultSettlementRequired,
    NothingToClaim,
    Unauthorized
} from "../src/ProoflyOperations.sol";

/// @dev Receptor ERC-1155 que intenta re-entrar en depositForOperation durante el mint.
contract ReentrantDepositor is IERC1155Receiver {
    ProoflyOperations public immutable operations;
    MockUSDC public immutable usdc;
    bytes32 public immutable hmac;
    bool public attacked;

    constructor(ProoflyOperations operations_, MockUSDC usdc_, bytes32 hmac_) {
        operations = operations_;
        usdc = usdc_;
        hmac = hmac_;
    }

    function deposit(uint256 amount) external {
        usdc.approve(address(operations), type(uint256).max);
        operations.depositForOperation(hmac, amount);
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external returns (bytes4) {
        if (!attacked) {
            attacked = true;
            operations.depositForOperation(hmac, 5);
        }
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}

contract ProoflyVaultTest is Test {
    MockUSDC public usdc;
    ProoflyKYCRegistry public kyc;
    ProoflyOperations public operations;

    address public owner = address(0xA11CE);
    address public reconciler = address(0xB0B);
    address public financier = address(0xC0DE);
    address public financier2 = address(0xC0DE2);
    address public financier3 = address(0xC0DE3);
    address public nonKyc = address(0xDEAD);

    bytes32 public hmac = keccak256("operation-vault-1");
    bytes32 public dossier = keccak256("dossier-vault-1");

    // 1 mUSDC = 1_000_000 unidades = 400_000 centavos COP.
    uint256 internal constant ONE_USDC = 1_000_000;

    function setUp() public {
        vm.startPrank(owner);
        usdc = new MockUSDC(owner);
        kyc = new ProoflyKYCRegistry(owner);
        operations = new ProoflyOperations(owner, address(kyc), address(usdc));
        operations.setReconciler(reconciler, true);
        kyc.setKycStatus(financier, true);
        kyc.setKycStatus(financier2, true);
        kyc.setKycStatus(financier3, true);
        usdc.mint(financier, 1_000 * ONE_USDC);
        usdc.mint(financier2, 1_000 * ONE_USDC);
        usdc.mint(financier3, 1_000 * ONE_USDC);
        usdc.mint(reconciler, 1_000 * ONE_USDC);
        vm.stopPrank();

        vm.prank(reconciler);
        usdc.approve(address(operations), type(uint256).max);
    }

    function openOperation(uint256 targetCents) internal returns (uint256 tokenId) {
        vm.prank(owner);
        tokenId = operations.openOperation(hmac, dossier, targetCents, block.timestamp + 30 days);
    }

    function deposit(address who, uint256 amountUsdc) internal {
        vm.startPrank(who);
        usdc.approve(address(operations), amountUsdc);
        operations.depositForOperation(hmac, amountUsdc);
        vm.stopPrank();
    }

    function state(uint256 tokenId) internal view returns (uint8 s) {
        (,,,, ProoflyOperations.OperationState st,,) = operations.operations(tokenId);
        s = uint8(st);
    }

    // ---------------------------------------------------------------- deposits

    function test_MockUsdcUsesSixDecimals() public view {
        assertEq(usdc.decimals(), 6);
    }

    function test_DepositMintsExactERC1155Shares() public {
        uint256 tokenId = openOperation(250_000);
        deposit(financier, 625_000);

        assertEq(tokenId, 1);
        assertEq(operations.balanceOf(financier, tokenId), 250_000);
        assertEq(operations.fundedCentsByOperation(tokenId), 250_000);
        assertEq(operations.fundedUsdcByOperation(tokenId), 625_000);
        assertEq(usdc.balanceOf(address(operations)), 625_000);
        assertEq(usdc.balanceOf(financier), 1_000 * ONE_USDC - 625_000);
        assertEq(state(tokenId), uint8(ProoflyOperations.OperationState.Funded));
    }

    function test_DepositRevertsWithoutApproval() public {
        openOperation(250_000);
        vm.prank(financier);
        vm.expectRevert();
        operations.depositForOperation(hmac, 625_000);
    }

    function test_DepositRevertsWithInsufficientBalance() public {
        openOperation(4_000_000_000); // 10.000 mUSDC
        vm.startPrank(financier);
        usdc.approve(address(operations), 2_000 * ONE_USDC);
        vm.expectRevert();
        operations.depositForOperation(hmac, 2_000 * ONE_USDC);
        vm.stopPrank();
    }

    function test_DepositRevertsForNonKycWallet() public {
        openOperation(250_000);
        vm.prank(owner);
        usdc.mint(nonKyc, 625_000);

        vm.startPrank(nonKyc);
        usdc.approve(address(operations), 625_000);
        vm.expectRevert(abi.encodeWithSelector(KycVerificationRequired.selector, nonKyc));
        operations.depositForOperation(hmac, 625_000);
        vm.stopPrank();
    }

    function test_DepositRevertsBeforeOperationIsOpen() public {
        vm.startPrank(financier);
        usdc.approve(address(operations), 625_000);
        vm.expectRevert(abi.encodeWithSelector(OperationNotFound.selector, 0));
        operations.depositForOperation(hmac, 625_000);
        vm.stopPrank();
    }

    function test_DepositRevertsIfItOverfunds() public {
        openOperation(250_000);
        vm.startPrank(financier);
        usdc.approve(address(operations), 1_000_000);
        vm.expectRevert(abi.encodeWithSelector(FundingExceedsRemaining.selector, 250_000, 280_000));
        operations.depositForOperation(hmac, 700_000);
        vm.stopPrank();
    }

    function test_DepositRevertsForNonRepresentableAmount() public {
        openOperation(250_000);
        vm.startPrank(financier);
        usdc.approve(address(operations), 1);
        // 1 unidad mínima = 0,4 centavos COP: no es un número entero de centavos.
        vm.expectRevert(abi.encodeWithSelector(InvalidUsdcAmount.selector, 1));
        operations.depositForOperation(hmac, 1);
        vm.stopPrank();
    }

    function test_DoubleDepositAfterFundedReverts() public {
        uint256 tokenId = openOperation(250_000);
        deposit(financier, 625_000);

        vm.startPrank(financier);
        usdc.approve(address(operations), 625_000);
        vm.expectRevert(abi.encodeWithSelector(OperationNotOpen.selector, tokenId));
        operations.depositForOperation(hmac, 625_000);
        vm.stopPrank();
    }

    function test_PartialDepositsKeepOperationOpenUntilTarget() public {
        uint256 tokenId = openOperation(40_000_000); // 100 mUSDC
        deposit(financier, 60 * ONE_USDC);
        assertEq(state(tokenId), uint8(ProoflyOperations.OperationState.OpenForFunding));
        assertEq(operations.fundedCentsByOperation(tokenId), 24_000_000);

        deposit(financier2, 40 * ONE_USDC);
        assertEq(state(tokenId), uint8(ProoflyOperations.OperationState.Funded));
        assertEq(operations.balanceOf(financier, tokenId) + operations.balanceOf(financier2, tokenId), 40_000_000);
    }

    function test_OpenRejectsDuplicateHmacAcrossBothMintPaths() public {
        address[] memory holders = new address[](1);
        uint256[] memory shares = new uint256[](1);
        holders[0] = financier;
        shares[0] = 250_000;
        vm.prank(owner);
        uint256 legacyId = operations.mintOperation(hmac, dossier, 250_000, block.timestamp + 30 days, holders, shares);
        assertEq(operations.hmacToTokenId(hmac), legacyId);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(OperationAlreadyRegistered.selector, hmac));
        operations.openOperation(hmac, dossier, 250_000, block.timestamp + 30 days);
    }

    function test_OpenRejectsNonRepresentableTarget() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(InvalidUsdcAmount.selector, 250_001));
        operations.openOperation(hmac, dossier, 250_001, block.timestamp + 30 days);
    }

    function test_DepositReentrancyIsBlocked() public {
        openOperation(40_000_000);
        ReentrantDepositor attacker = new ReentrantDepositor(operations, usdc, hmac);
        vm.startPrank(owner);
        kyc.setKycStatus(address(attacker), true);
        usdc.mint(address(attacker), 100 * ONE_USDC);
        vm.stopPrank();

        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        attacker.deposit(10 * ONE_USDC);
        assertEq(operations.fundedUsdcByOperation(1), 0);
    }

    // -------------------------------------------------------------- settlement

    function test_SettleBeforeFundedReverts() public {
        uint256 tokenId = openOperation(40_000_000);
        deposit(financier, 10 * ONE_USDC);
        vm.prank(reconciler);
        vm.expectRevert(abi.encodeWithSelector(InvalidOperationState.selector, uint8(4), uint8(5)));
        operations.fundAndSettleOperation(tokenId, keccak256("r"), 102 * ONE_USDC);
    }

    function test_SettleRejectsLessThanFundedCapital() public {
        uint256 tokenId = openOperation(40_000_000);
        deposit(financier, 100 * ONE_USDC);
        vm.prank(reconciler);
        vm.expectRevert(abi.encodeWithSelector(InsufficientSettlement.selector, 99 * ONE_USDC, 100 * ONE_USDC));
        operations.fundAndSettleOperation(tokenId, keccak256("r"), 99 * ONE_USDC);
    }

    function test_SettleRequiresReconciler() public {
        uint256 tokenId = openOperation(40_000_000);
        deposit(financier, 100 * ONE_USDC);
        vm.prank(financier);
        vm.expectRevert(Unauthorized.selector);
        operations.fundAndSettleOperation(tokenId, keccak256("r"), 102 * ONE_USDC);
    }

    function test_SettleTwiceReverts() public {
        uint256 tokenId = openOperation(40_000_000);
        deposit(financier, 100 * ONE_USDC);
        vm.startPrank(reconciler);
        operations.fundAndSettleOperation(tokenId, keccak256("r"), 102 * ONE_USDC);
        vm.expectRevert(abi.encodeWithSelector(InvalidOperationState.selector, uint8(7), uint8(5)));
        operations.fundAndSettleOperation(tokenId, keccak256("r2"), 102 * ONE_USDC);
        vm.stopPrank();
    }

    function test_LegacySettleCannotBypassVault() public {
        uint256 tokenId = openOperation(40_000_000);
        deposit(financier, 100 * ONE_USDC);
        vm.prank(reconciler);
        vm.expectRevert(abi.encodeWithSelector(VaultSettlementRequired.selector, tokenId));
        operations.settleOperation(tokenId, keccak256("r"), 40_000_000);
    }

    // ------------------------------------------------------------------ claims

    function test_ClaimBeforeSettlementReverts() public {
        uint256 tokenId = openOperation(250_000);
        deposit(financier, 625_000);
        vm.prank(financier);
        vm.expectRevert(abi.encodeWithSelector(InvalidOperationState.selector, uint8(5), uint8(7)));
        operations.claimSettlement(tokenId);
    }

    function test_SettleFundAndClaimExactCapitalPlusProfit() public {
        // Meta 97 mUSDC (adelanto 388.000 COP); ganancia 2 mUSDC (descuento 8.000 COP).
        uint256 tokenId = openOperation(38_800_000);
        deposit(financier, 97 * ONE_USDC);
        uint256 before = usdc.balanceOf(financier);

        vm.prank(reconciler);
        operations.fundAndSettleOperation(tokenId, keccak256("bank-receipt"), 99 * ONE_USDC);

        assertEq(state(tokenId), uint8(ProoflyOperations.OperationState.Settled));
        assertEq(operations.settlementPoolUsdcByOperation(tokenId), 2 * ONE_USDC);
        assertEq(operations.claimableUsdc(tokenId, financier), 99 * ONE_USDC);

        vm.prank(financier);
        operations.claimSettlement(tokenId);

        assertEq(usdc.balanceOf(financier) - before, 99 * ONE_USDC);
        assertEq(operations.balanceOf(financier, tokenId), 0);
        assertEq(operations.claimableUsdc(tokenId, financier), 0);
        assertEq(usdc.balanceOf(address(operations)), 0);
        assertEq(operations.claimedUsdcByOperation(tokenId, financier), 99 * ONE_USDC);

        vm.prank(financier);
        vm.expectRevert(NothingToClaim.selector);
        operations.claimSettlement(tokenId);
    }

    function test_ClaimRequiresKyc() public {
        uint256 tokenId = openOperation(40_000_000);
        deposit(financier, 100 * ONE_USDC);
        vm.prank(reconciler);
        operations.fundAndSettleOperation(tokenId, keccak256("r"), 102 * ONE_USDC);

        vm.prank(owner);
        kyc.setKycStatus(financier, false);
        vm.prank(financier);
        vm.expectRevert(abi.encodeWithSelector(KycVerificationRequired.selector, financier));
        operations.claimSettlement(tokenId);
    }

    function test_TransferRequiresSenderKyc() public {
        uint256 tokenId = openOperation(40_000_000);
        deposit(financier, 100 * ONE_USDC);
        vm.prank(owner);
        kyc.setKycStatus(financier, false);
        vm.prank(financier);
        vm.expectRevert(abi.encodeWithSelector(KycVerificationRequired.selector, financier));
        operations.safeTransferFrom(financier, financier2, tokenId, 1_000, "");
    }

    function test_MultipleFinanciersReceiveExactTotalWithoutDust() public {
        // Meta 1.000.000 centavos = 2,5 mUSDC repartida 333.334 / 333.334 / 333.332.
        uint256 tokenId = openOperation(1_000_000);
        deposit(financier, 833_335);
        deposit(financier2, 833_335);
        deposit(financier3, 833_330);
        assertEq(state(tokenId), uint8(ProoflyOperations.OperationState.Funded));

        // Ganancia de 15 unidades: no se divide exacto entre los tres aportes.
        uint256 total = 2_500_015;
        vm.prank(reconciler);
        operations.fundAndSettleOperation(tokenId, keccak256("r"), total);

        uint256 b1 = usdc.balanceOf(financier);
        uint256 b2 = usdc.balanceOf(financier2);
        uint256 b3 = usdc.balanceOf(financier3);
        vm.prank(financier);
        operations.claimSettlement(tokenId);
        vm.prank(financier3);
        operations.claimSettlement(tokenId);
        vm.prank(financier2);
        operations.claimSettlement(tokenId);

        uint256 p1 = usdc.balanceOf(financier) - b1;
        uint256 p2 = usdc.balanceOf(financier2) - b2;
        uint256 p3 = usdc.balanceOf(financier3) - b3;
        assertEq(p1 + p2 + p3, total, "sum paid equals capital + profit");
        assertEq(usdc.balanceOf(address(operations)), 0, "no dust left in the vault");
        assertGe(p1, 833_335);
        assertGe(p2, 833_335);
        assertGe(p3, 833_330);
        assertEq(operations.totalClaimedUsdcByOperation(tokenId), total);
    }

    function test_TransferredSharesClaimProportionally() public {
        uint256 tokenId = openOperation(40_000_000);
        deposit(financier, 100 * ONE_USDC);
        vm.prank(financier);
        operations.safeTransferFrom(financier, financier2, tokenId, 10_000_000, "");

        vm.prank(reconciler);
        operations.fundAndSettleOperation(tokenId, keccak256("r"), 104 * ONE_USDC);

        assertEq(operations.claimableUsdc(tokenId, financier2), 26 * ONE_USDC);
        vm.prank(financier2);
        operations.claimSettlement(tokenId);
        vm.prank(financier);
        operations.claimSettlement(tokenId);
        assertEq(usdc.balanceOf(address(operations)), 0);
    }

    // ------------------------------------------------------------------- fuzz

    function testFuzz_DepositConvertsExactCopCents(uint64 seed) public view {
        // Las unidades representables son múltiplos de 5 (5 unidades = 2 centavos).
        uint256 amountUsdc = bound(uint256(seed), 1, 200_000_000_000) * 5;
        uint256 cents = operations.usdcToCopCents(amountUsdc);
        assertEq(cents * 5, amountUsdc * 2);
        assertEq(operations.copCentsToUsdc(cents), amountUsdc);
    }

    function testFuzz_TwoFinanciersClaimExactTotal(uint32 splitSeed, uint32 profitSeed) public {
        uint256 target = 40_000_000; // 100 mUSDC
        // El primer aporte en pasos de 2 centavos para que sea representable.
        uint256 firstCents = bound(uint256(splitSeed), 1, target / 2 - 1) * 2;
        uint256 firstUsdc = operations.copCentsToUsdc(firstCents);
        uint256 secondUsdc = 100 * ONE_USDC - firstUsdc;
        uint256 profitUsdc = bound(uint256(profitSeed), 0, 50 * ONE_USDC / 5) * 5;

        uint256 tokenId = openOperation(target);
        deposit(financier, firstUsdc);
        deposit(financier2, secondUsdc);

        uint256 total = 100 * ONE_USDC + profitUsdc;
        vm.prank(reconciler);
        operations.fundAndSettleOperation(tokenId, keccak256("r"), total);

        uint256 b1 = usdc.balanceOf(financier);
        uint256 b2 = usdc.balanceOf(financier2);
        vm.prank(financier2);
        operations.claimSettlement(tokenId);
        vm.prank(financier);
        operations.claimSettlement(tokenId);
        assertEq((usdc.balanceOf(financier) - b1) + (usdc.balanceOf(financier2) - b2), total);
        assertEq(usdc.balanceOf(address(operations)), 0);
    }
}
