import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UsdcDemoRate } from '../financial/usdc-demo-rate.ts';
import { RecordVaultDepositUseCase } from './record-vault-deposit.use-case.ts';
import { RecordVaultClaimUseCase } from './record-vault-claim.use-case.ts';
import { OperationEntity, AssetType } from '../models/operation.ts';
import { InvestmentEntity } from '../models/investment.ts';
import { UserEntity, UserRole, KycStatus } from '../models/user.ts';
import { OutboxEvent } from '../models/outbox.ts';
import { OperationStatus } from '../state/operation-state.ts';
import { VaultInconsistencyError } from '../ports/vault-ledger.port.ts';
import type { VaultLedgerPort, VaultOperationSnapshot } from '../ports/vault-ledger.port.ts';

const TX = '0x' + 'ab'.repeat(32);
const WALLET = '0x7b52FDA3e0B84a1B67aD0FfDA6f02cD4daD07616';

function fixtures(opts: { target?: bigint; shares?: bigint; fundedOnChain?: bigint } = {}) {
  const now = new Date();
  const op = new OperationEntity({
    id: 'op-1', freelancerId: 'free-1', payerNit: '9', payerLegalName: 'Empresa', assetType: AssetType.INVOICE,
    nominalAmountCents: 40_000_000n, termDays: 30, dueDate: '2026-12-31', advanceAmountCents: 38_800_000n,
    commercialDiscountCents: 800_000n, prooflyFeeCents: 400_000n, fundedCapitalCents: 0n,
    status: OperationStatus.APPROVED_PENDING_FUNDING, hmacKey: '0xh', createdAt: now, updatedAt: now
  });
  const investor = new UserEntity({ id: 'inv-1', email: 'i@p.co', legalName: 'Inv', taxId: '1', role: UserRole.INVESTOR, kycStatus: KycStatus.VERIFIED, walletAddress: WALLET, createdAt: now, updatedAt: now });
  const ops = new Map([[op.id, op]]);
  const investments: InvestmentEntity[] = [];
  const outbox: OutboxEvent[] = [];
  const operationRepo = { async findById(id: string) { return ops.get(id) ?? null; }, async save(o: OperationEntity) { ops.set(o.id, o); } } as never;
  const investmentRepo = { async save(i: InvestmentEntity) { const k = investments.findIndex(x => x.id === i.id); if (k >= 0) investments[k] = i; else investments.push(i); }, async findByInvestorId(id: string) { return investments.filter(i => i.investorId === id); } } as never;
  const userRepo = { async findById(id: string) { return id === investor.id ? investor : null; } } as never;
  const outboxRepo = {
    async recordEvent(e: never) { const ev = new OutboxEvent({ ...(e as object), id: crypto.randomUUID(), status: 'PENDING', retryCount: 0, createdAt: new Date() } as never); outbox.push(ev); return ev; },
    async listByAggregate(t: string, id: string) { return outbox.filter(e => e.aggregateType === t && e.aggregateId === id); }
  } as never;
  const shares = opts.shares ?? 38_800_000n;
  const snapshot: VaultOperationSnapshot = {
    tokenId: 5n, chainKey: '0xkey', targetCents: opts.target ?? 38_800_000n, state: 'Funded',
    fundedCents: opts.fundedOnChain ?? shares, fundedUsdcUnits: 97_000_000n, profitPoolUsdcUnits: 0n, settledCents: 0n, settlementProofHash: '0x0'
  };
  let verifyCalls = 0;
  const ledger: VaultLedgerPort = {
    chainKeyFor: () => '0xkey',
    async getOperation() { return snapshot; },
    async getHolderShares() { return shares; },
    async getClaimableUnits() { return 0n; },
    async getWallet() { return { address: WALLET, kycVerified: true, usdcUnits: 0n, allowanceUnits: 0n }; },
    async verifyDeposit() { verifyCalls++; return { txHash: TX, blockNumber: 10n, tokenId: 5n, financier: WALLET, amountUsdcUnits: 97_000_000n, sharesCents: shares }; },
    async verifyClaim() { return { txHash: TX, blockNumber: 11n, tokenId: 5n, financier: WALLET, amountUsdcUnits: 99_000_000n }; }
  };
  return { op, ops, investments, outbox, operationRepo, investmentRepo, userRepo, outboxRepo, ledger, calls: () => verifyCalls };
}

describe('UsdcDemoRate (1 mUSDC = 4000 COP)', () => {
  const rate = new UsdcDemoRate(4000n);
  it('converts 1.000.000 units <-> 400.000 cents exactly', () => {
    assert.equal(rate.unitsToCents(1_000_000n), 400_000n);
    assert.equal(rate.centsToUnits(38_800_000n), 97_000_000n);
  });
  it('rejects amounts without an exact equivalent', () => {
    assert.equal(rate.isUnitsRepresentable(1n), false);
    assert.equal(rate.isCentsRepresentable(1n), false);
    assert.throws(() => rate.centsToUnits(1n));
  });
});

describe('RecordVaultDepositUseCase', () => {
  it('records the COP participation from the on-chain shares and is idempotent', async () => {
    const f = fixtures();
    const uc = new RecordVaultDepositUseCase(f.operationRepo, f.investmentRepo, f.userRepo, f.outboxRepo, f.ledger);
    const first = await uc.execute({ operationId: 'op-1', investorId: 'inv-1', txHash: TX });
    assert.equal(first.isNew, true);
    assert.equal(first.investment.fundedCapitalCents, 38_800_000n);
    assert.equal(f.ops.get('op-1')!.status, OperationStatus.ACTIVE_FUNDED);
    assert.ok(f.outbox.some(e => e.eventType === 'INVESTMENT_DEPOSIT_CONFIRMED' && e.payload.txHash === TX));
    const again = await uc.execute({ operationId: 'op-1', investorId: 'inv-1', txHash: TX });
    assert.equal(again.isNew, false);
    assert.equal(f.investments.length, 1, 'same proof does not add a second participation');
  });

  it('blocks when the on-chain target differs from the off-chain advance', async () => {
    const f = fixtures({ target: 100_000_000n });
    const uc = new RecordVaultDepositUseCase(f.operationRepo, f.investmentRepo, f.userRepo, f.outboxRepo, f.ledger);
    await assert.rejects(uc.execute({ operationId: 'op-1', investorId: 'inv-1', txHash: TX }), VaultInconsistencyError);
    assert.equal(f.investments.length, 0);
  });

  it('never records more than what is deposited on-chain', async () => {
    const f = fixtures({ shares: 20_000_000n, fundedOnChain: 10_000_000n });
    const uc = new RecordVaultDepositUseCase(f.operationRepo, f.investmentRepo, f.userRepo, f.outboxRepo, f.ledger);
    await assert.rejects(uc.execute({ operationId: 'op-1', investorId: 'inv-1', txHash: TX }), VaultInconsistencyError);
  });

  it('rejects a malformed transaction hash before touching the chain', async () => {
    const f = fixtures();
    const uc = new RecordVaultDepositUseCase(f.operationRepo, f.investmentRepo, f.userRepo, f.outboxRepo, f.ledger);
    await assert.rejects(uc.execute({ operationId: 'op-1', investorId: 'inv-1', txHash: '0x12' }));
    assert.equal(f.calls(), 0);
  });

  it('rejects investing in an own operation', async () => {
    const f = fixtures();
    f.op.freelancerId = 'inv-1';
    const uc = new RecordVaultDepositUseCase(f.operationRepo, f.investmentRepo, f.userRepo, f.outboxRepo, f.ledger);
    await assert.rejects(uc.execute({ operationId: 'op-1', investorId: 'inv-1', txHash: TX }), /own operation/);
  });
});

describe('RecordVaultClaimUseCase', () => {
  it('records a verified claim once', async () => {
    const f = fixtures();
    await new RecordVaultDepositUseCase(f.operationRepo, f.investmentRepo, f.userRepo, f.outboxRepo, f.ledger)
      .execute({ operationId: 'op-1', investorId: 'inv-1', txHash: TX });
    await assert.rejects(new RecordVaultClaimUseCase(f.operationRepo, f.investmentRepo, f.userRepo, f.outboxRepo, f.ledger)
      .execute({ operationId: 'op-1', investorId: 'inv-1', txHash: TX }), /not settled/);
    f.ops.get('op-1')!.status = OperationStatus.SETTLED;
    const uc = new RecordVaultClaimUseCase(f.operationRepo, f.investmentRepo, f.userRepo, f.outboxRepo, f.ledger);
    assert.equal((await uc.execute({ operationId: 'op-1', investorId: 'inv-1', txHash: TX })).isNew, true);
    assert.equal((await uc.execute({ operationId: 'op-1', investorId: 'inv-1', txHash: TX })).isNew, false);
    assert.equal(f.outbox.filter(e => e.eventType === 'INVESTMENT_CLAIMED').length, 1);
  });
});
