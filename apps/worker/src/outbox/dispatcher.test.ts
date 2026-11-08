import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OutboxDispatcher } from './dispatcher.ts';
import { OutboxEvent, OutboxStatus } from '@proofly/domain';
import type { OutboxRepositoryPort, BlockchainPort, PaymentRailPort } from '@proofly/domain';

class MemOutbox implements OutboxRepositoryPort {
  events: OutboxEvent[] = [];
  add(e: Partial<OutboxEvent> & { eventType: string; payload: unknown }) {
    const ev = new OutboxEvent({ id: e.id ?? crypto.randomUUID(), aggregateType: 'OPERATION', aggregateId: 'op', eventType: e.eventType, payload: e.payload, status: OutboxStatus.PENDING, retryCount: 0, createdAt: new Date() });
    this.events.push(ev); return ev;
  }
  async recordEvent() { throw new Error('not used'); }
  async fetchPendingEvents() { return this.events.filter(e => e.status === OutboxStatus.PENDING); }
  async markCompleted(id: string) { const e = this.events.find(ev => ev.id === id); if (e) e.status = OutboxStatus.COMPLETED; }
  async markFailed(id: string, reason: string) { const e = this.events.find(ev => ev.id === id); if (e) { e.lastError = reason; e.retryCount++; } }
}
const okChain: BlockchainPort = { async mintOperationTokens() { return { txHash: '0x', success: true }; }, async burnOperationTokens() { return { txHash: '0x', success: true }; } };
const okRail: PaymentRailPort = { async disburseAdvance() { return { transactionId: 't', success: true }; } };

describe('OutboxDispatcher backoff', () => {
  it('a failing event waits an exponential delay before being retried', async () => {
    const outbox = new MemOutbox();
    outbox.add({ eventType: 'OPERATION_FULLY_FUNDED', payload: { operationId: 'op', advanceAmountCents: '1', totalFundedCents: '1' } });
    let fail = true;
    // A blockchain that fails once, then succeeds.
    const chain: BlockchainPort = { async mintOperationTokens() { if (fail) throw new Error('boom'); return { txHash: '0x', success: true }; }, async burnOperationTokens() { return { txHash: '0x', success: true }; } };
    let clock = 1000;
    const d = new OutboxDispatcher(outbox, chain, okRail, { baseDelayMs: 1000, now: () => clock });

    let r = await d.processBatch();
    assert.equal(r.failedCount, 1, 'first attempt fails');
    assert.equal(outbox.events[0].retryCount, 1);

    // Immediately after, the event is skipped (still within backoff window).
    fail = false;
    r = await d.processBatch();
    assert.equal(r.skippedCount, 1, 'retried too soon → skipped');
    assert.equal(r.processedCount, 0);

    // After the backoff delay (1000 * 2^1 = 2000ms) it is retried and succeeds.
    clock += 2000;
    r = await d.processBatch();
    assert.equal(r.processedCount, 1, 'retried after backoff → processed');
    assert.equal(outbox.events[0].status, OutboxStatus.COMPLETED);
  });

  it('stops retrying once maxRetries is exhausted', async () => {
    const outbox = new MemOutbox();
    outbox.add({ eventType: 'OPERATION_FULLY_FUNDED', payload: { operationId: 'op', advanceAmountCents: '1', totalFundedCents: '1' } });
    const chain: BlockchainPort = { async mintOperationTokens() { throw new Error('always'); }, async burnOperationTokens() { return { txHash: '0x', success: true }; } };
    let clock = 0;
    const d = new OutboxDispatcher(outbox, chain, okRail, { maxRetries: 3, baseDelayMs: 10, now: () => clock });

    let attempts = 0;
    for (let i = 0; i < 20; i++) {
      clock += 100000; // always past any backoff window
      const r = await d.processBatch();
      attempts += r.failedCount;
      if (r.failedCount === 0) break;
    }
    assert.equal(attempts, 3, 'exactly maxRetries attempts, then it stops');
    assert.equal(outbox.events[0].retryCount, 3);
  });

  it('a healthy event is dispatched on the first pass', async () => {
    const outbox = new MemOutbox();
    outbox.add({ eventType: 'OPERATION_FULLY_FUNDED', payload: { operationId: 'op', advanceAmountCents: '1', totalFundedCents: '1' } });
    const d = new OutboxDispatcher(outbox, okChain, okRail, { now: () => 0 });
    const r = await d.processBatch();
    assert.equal(r.processedCount, 1);
    assert.equal(r.failedCount, 0);
  });
});
