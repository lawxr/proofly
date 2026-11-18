import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OutboxDispatcher } from './dispatcher.ts';
import { OutboxEvent, OutboxStatus } from '@proofly/domain';
import type { OutboxRepositoryPort, BlockchainPort, PaymentRailPort, VaultLedgerPort, VaultOperationSnapshot } from '@proofly/domain';

class MemOutbox implements OutboxRepositoryPort {
  events: OutboxEvent[] = [];
  add(eventType: string, payload: Record<string, unknown>) {
    const ev = new OutboxEvent({ id: crypto.randomUUID(), aggregateType: 'OPERATION', aggregateId: 'op', eventType, payload, status: OutboxStatus.PENDING, retryCount: 0, createdAt: new Date() });
    this.events.push(ev); return ev;
  }
  async recordEvent(): Promise<OutboxEvent> { throw new Error('not used'); }
  async fetchPendingEvents() { return this.events.filter(e => e.status === OutboxStatus.PENDING); }
  async markCompleted(id: string) { const e = this.events.find(ev => ev.id === id)!; e.status = OutboxStatus.COMPLETED; }
  async markFailed(id: string, reason: string) { const e = this.events.find(ev => ev.id === id)!; e.status = OutboxStatus.FAILED; e.lastError = reason; e.retryCount++; }
  async markRetry(id: string, reason: string) { const e = this.events.find(ev => ev.id === id)!; e.lastError = reason; e.retryCount++; }
}
const rail: PaymentRailPort = { async disburseAdvance() { return { transactionId: 't', success: true }; } };
const snap = (over: Partial<VaultOperationSnapshot> = {}): VaultOperationSnapshot => ({
  tokenId: 5n, chainKey: '0xk', targetCents: 38_800_000n, state: 'Funded', fundedCents: 38_800_000n,
  fundedUsdcUnits: 97_000_000n, profitPoolUsdcUnits: 0n, settledCents: 0n, settlementProofHash: '0x0', ...over
});
function ledger(vault: VaultOperationSnapshot | null): VaultLedgerPort {
  return {
    chainKeyFor: () => '0xk', async getOperation() { return vault; }, async getHolderShares() { return 0n; },
    async getClaimableUnits() { return 0n; }, async getWallet() { throw new Error('unused'); },
    async verifyDeposit() { throw new Error('unused'); }, async verifyClaim() { throw new Error('unused'); }
  };
}
const silent = () => undefined;

describe('OutboxDispatcher · mUSDC vault', () => {
  it('opens the operation with the advance as funding target and requires a tokenId', async () => {
    const outbox = new MemOutbox();
    outbox.add('OPERATION_LISTED_ON_MARKETPLACE', { operationId: 'op', advanceAmountCents: '38800000' });
    const calls: bigint[] = [];
    const chain: BlockchainPort = {
      async mintOperationTokens() { throw new Error('legacy mint must not run'); },
      async burnOperationTokens() { throw new Error('legacy burn must not run'); },
      async openOperationTokens(p) { calls.push(p.fundingTargetCents); return { txHash: '0xopen', success: true, tokenId: 5n }; },
      async fundAndSettleOperation() { return { txHash: '0x', success: true }; }
    };
    const d = new OutboxDispatcher(outbox, chain, rail, { vaultMode: true, ledger: ledger(null), log: silent });
    assert.equal((await d.processBatch()).processedCount, 1);
    assert.deepEqual(calls, [38_800_000n]);
  });

  it('does not mark COMPLETED when the chain returns no tokenId', async () => {
    const outbox = new MemOutbox();
    outbox.add('OPERATION_LISTED_ON_MARKETPLACE', { operationId: 'op', advanceAmountCents: '38800000' });
    const chain: BlockchainPort = {
      async mintOperationTokens() { return { txHash: '', success: true }; }, async burnOperationTokens() { return { txHash: '', success: true }; },
      async openOperationTokens() { return { txHash: 'mined but hmacToTokenId is still 0', success: false }; },
      async fundAndSettleOperation() { return { txHash: '', success: true }; }
    };
    const d = new OutboxDispatcher(outbox, chain, rail, { vaultMode: true, ledger: ledger(null), log: silent });
    const r = await d.processBatch();
    assert.equal(r.failedCount, 1);
    assert.equal(outbox.events[0].status, OutboxStatus.PENDING, 'transient: retried, not completed');
  });

  it('settles with the investor payout (capital + profit) in mUSDC units', async () => {
    const outbox = new MemOutbox();
    outbox.add('OPERATION_SETTLED', { operationId: 'op', bankReceiptHash: 'r', receivedAmountCents: '40000000', isFullySettled: true, investorPayoutCents: '39600000' });
    const received: bigint[] = [];
    const chain: BlockchainPort = {
      async mintOperationTokens() { return { txHash: '', success: true }; }, async burnOperationTokens() { throw new Error('legacy'); },
      async openOperationTokens() { return { txHash: '', success: true }; },
      async fundAndSettleOperation(p) { received.push(p.receivedUsdc); return { txHash: '0xsettle', success: true, tokenId: 5n }; }
    };
    const d = new OutboxDispatcher(outbox, chain, rail, { vaultMode: true, ledger: ledger(snap()), log: silent });
    assert.equal((await d.processBatch()).processedCount, 1);
    assert.deepEqual(received, [99_000_000n]);
  });

  it('refuses a legacy settlement event permanently, without touching the chain', async () => {
    const outbox = new MemOutbox();
    outbox.add('OPERATION_SETTLED', { operationId: 'op', bankReceiptHash: 'r', receivedAmountCents: '40000000', isFullySettled: true });
    let touched = false;
    const chain: BlockchainPort = {
      async mintOperationTokens() { return { txHash: '', success: true }; }, async burnOperationTokens() { touched = true; return { txHash: '', success: true }; },
      async fundAndSettleOperation() { touched = true; return { txHash: '', success: true }; }, async openOperationTokens() { return { txHash: '', success: true }; }
    };
    const d = new OutboxDispatcher(outbox, chain, rail, { vaultMode: true, ledger: ledger(snap()), log: silent });
    await d.processBatch();
    assert.equal(outbox.events[0].status, OutboxStatus.FAILED);
    assert.equal(touched, false);
  });

  it('onboards a newly linked wallet (KYC + demo mUSDC + gas) and retries transient failures', async () => {
    const outbox = new MemOutbox();
    outbox.add('WALLET_ONBOARDING_REQUESTED', { userId: 'u1', walletAddress: '0x00000000000000000000000000000000000000c1' });
    const calls: { mint: bigint; eth: bigint }[] = [];
    let fail = true;
    const chain: BlockchainPort = {
      async mintOperationTokens() { return { txHash: '', success: true }; }, async burnOperationTokens() { return { txHash: '', success: true }; },
      async onboardDemoWallet(p) {
        calls.push({ mint: p.mintUsdcUnits, eth: p.topUpEthWei });
        if (fail) { fail = false; return { success: false, actions: [], txHashes: [], detail: 'rpc timeout' }; }
        return { success: true, actions: ['kyc', 'musdc', 'eth'], txHashes: ['0x1', '0x2', '0x3'] };
      }
    };
    let clock = 0;
    const d = new OutboxDispatcher(outbox, chain, rail, { vaultMode: true, ledger: ledger(null), log: silent, now: () => clock });
    assert.equal((await d.processBatch()).failedCount, 1);
    assert.equal(outbox.events[0].status, OutboxStatus.PENDING, 'transient failure is retried');
    clock += 120_000;
    assert.equal((await d.processBatch()).processedCount, 1);
    assert.equal(outbox.events[0].status, OutboxStatus.COMPLETED);
    assert.equal(calls[0].mint, 1000n * 1_000_000n);
  });

  it('does not disburse when the vault is not fully funded on-chain', async () => {
    const outbox = new MemOutbox();
    outbox.add('OPERATION_FULLY_FUNDED', { operationId: 'op', totalFundedCents: '38800000', advanceAmountCents: '38800000' });
    let disbursed = false;
    const chain: BlockchainPort = { async mintOperationTokens() { return { txHash: '', success: true }; }, async burnOperationTokens() { return { txHash: '', success: true }; }, async openOperationTokens() { return { txHash: '', success: true }; }, async fundAndSettleOperation() { return { txHash: '', success: true }; } };
    const d = new OutboxDispatcher(outbox, chain, { async disburseAdvance() { disbursed = true; return { transactionId: 't', success: true }; } }, { vaultMode: true, ledger: ledger(snap({ state: 'OpenForFunding', fundedCents: 10_000_000n })), log: silent });
    await d.processBatch();
    assert.equal(outbox.events[0].status, OutboxStatus.FAILED);
    assert.equal(disbursed, false);
  });
});
