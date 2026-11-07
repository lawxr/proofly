/**
 * @proofly/worker - Pruebas Unitarias del Worker Asíncrono
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { OutboxDispatcher } from './outbox/dispatcher.ts';
import { EVMEventIndexer } from './indexer/evm-indexer.ts';
import { DailyReconciliationJob } from './reconciliation/daily-job.ts';
import {
  OperationEntity,
  OperationStatus,
  AssetType,
  OutboxEvent,
  OutboxStatus
} from '@proofly/domain';

import type {
  OutboxRepositoryPort,
  BlockchainPort,
  PaymentRailPort,
  OperationRepositoryPort
} from '@proofly/domain';

import type {
  ChainLogProvider,
  RawLogEvent
} from './indexer/evm-indexer.ts';

import type {
  ChainDataProvider,
  BankDataProvider,
  OnChainOperationSnapshot,
  BankStatementRecord
} from './reconciliation/daily-job.ts';

// --- Test Doubles ---

class TestOutboxRepository implements OutboxRepositoryPort {
  events: OutboxEvent[] = [];

  async recordEvent(e: any): Promise<OutboxEvent> {
    const event = new OutboxEvent({
      id: crypto.randomUUID(),
      aggregateType: e.aggregateType,
      aggregateId: e.aggregateId,
      eventType: e.eventType,
      payload: e.payload,
      status: OutboxStatus.PENDING,
      retryCount: 0,
      createdAt: new Date()
    });
    this.events.push(event);
    return event;
  }

  async fetchPendingEvents(batchSize: number): Promise<OutboxEvent[]> {
    return this.events.filter(e => e.status === OutboxStatus.PENDING).slice(0, batchSize);
  }

  async markCompleted(id: string): Promise<void> {
    const e = this.events.find(ev => ev.id === id);
    if (e) {
      e.status = OutboxStatus.COMPLETED;
      e.processedAt = new Date();
    }
  }

  async markFailed(id: string, reason: string): Promise<void> {
    const e = this.events.find(ev => ev.id === id);
    if (e) {
      e.status = OutboxStatus.FAILED;
      e.lastError = reason;
      e.retryCount++;
    }
  }
}

class TestBlockchainPort implements BlockchainPort {
  mintCalls: any[] = [];
  burnCalls: any[] = [];
  shouldFail = false;

  async mintOperationTokens(params: any) {
    this.mintCalls.push(params);
    if (this.shouldFail) return { txHash: '0xfail', success: false };
    return { txHash: '0xminttx123', success: true };
  }

  async burnOperationTokens(params: any) {
    this.burnCalls.push(params);
    if (this.shouldFail) return { txHash: '0xfail', success: false };
    return { txHash: '0xburntx456', success: true };
  }
}

class TestPaymentRailPort implements PaymentRailPort {
  disburseCalls: any[] = [];
  shouldFail = false;

  async disburseAdvance(params: any) {
    this.disburseCalls.push(params);
    if (this.shouldFail) return { transactionId: 'TX-FAIL', success: false };
    return { transactionId: 'TX-ACH-OK', success: true };
  }
}

class TestChainLogProvider implements ChainLogProvider {
  currentBlock: bigint = 20n;
  logs: RawLogEvent[] = [];

  async getLatestBlockNumber(): Promise<bigint> {
    return this.currentBlock;
  }

  async getLogs(fromBlock: bigint, toBlock: bigint): Promise<RawLogEvent[]> {
    return this.logs.filter(l => l.blockNumber >= fromBlock && l.blockNumber <= toBlock);
  }
}

describe('Proofly Worker Async Subsystem', () => {
  it('1. OutboxDispatcher processes fully funded operation: mints on Base and disburses via ACH', async () => {
    const outboxRepo = new TestOutboxRepository();
    const blockchain = new TestBlockchainPort();
    const paymentRail = new TestPaymentRailPort();
    const dispatcher = new OutboxDispatcher(outboxRepo, blockchain, paymentRail);

    const event = await outboxRepo.recordEvent({
      aggregateType: 'OPERATION',
      aggregateId: 'op-101',
      eventType: 'OPERATION_FULLY_FUNDED',
      payload: {
        operationId: 'op-101',
        freelancerId: 'free-001',
        totalFundedCents: '100000000', // $ 1.000.000 COP
        advanceAmountCents: '97000000', // $ 970.000 COP
        hmacKey: '0xabc123'
      }
    });

    const result = await dispatcher.processBatch();
    assert.equal(result.processedCount, 1);
    assert.equal(result.failedCount, 0);

    assert.equal(blockchain.mintCalls.length, 1);
    assert.equal(blockchain.mintCalls[0].amountTokens, 100000000n);

    assert.equal(paymentRail.disburseCalls.length, 1);
    assert.equal(paymentRail.disburseCalls[0].amountCents, 97000000n);

    assert.equal(outboxRepo.events[0].status, OutboxStatus.COMPLETED);
  });

  it('2. OutboxDispatcher handles failures and marks outbox event as FAILED with error', async () => {
    const outboxRepo = new TestOutboxRepository();
    const blockchain = new TestBlockchainPort();
    const paymentRail = new TestPaymentRailPort();
    paymentRail.shouldFail = true; // Simular falla ACH
    const dispatcher = new OutboxDispatcher(outboxRepo, blockchain, paymentRail);

    await outboxRepo.recordEvent({
      aggregateType: 'OPERATION',
      aggregateId: 'op-102',
      eventType: 'OPERATION_FULLY_FUNDED',
      payload: {
        operationId: 'op-102',
        freelancerId: 'free-001',
        totalFundedCents: '50000000',
        advanceAmountCents: '48500000',
        hmacKey: '0xdef456'
      }
    });

    const result = await dispatcher.processBatch();
    assert.equal(result.processedCount, 0);
    assert.equal(result.failedCount, 1);

    assert.equal(outboxRepo.events[0].status, OutboxStatus.FAILED);
    assert.ok(outboxRepo.events[0].lastError?.includes('Failed to disburse advance'));
  });

  it('3. EVMEventIndexer respects 12-block reorg safety window on Base L2', async () => {
    const provider = new TestChainLogProvider();
    provider.currentBlock = 25n; // Block 25 -> Safe target is 25 - 12 = 13n

    provider.logs = [
      {
        blockNumber: 5n,
        transactionHash: '0xtx1',
        eventName: 'OperationMinted',
        data: { tokenId: 1n }
      },
      {
        blockNumber: 13n,
        transactionHash: '0xtx2',
        eventName: 'OperationSettled',
        data: { tokenId: 1n }
      },
      {
        blockNumber: 20n, // Debe ser ignorado por no tener 12 confirmaciones
        transactionHash: '0xtx3',
        eventName: 'OperationMinted',
        data: { tokenId: 2n }
      }
    ];

    const indexer = new EVMEventIndexer(provider, 0n);
    const cycle = await indexer.runIndexingCycle();

    assert.equal(cycle.toBlock, 13n);
    assert.equal(cycle.eventsCount, 2);
    assert.equal(indexer.getLastIndexedBlock(), 13n);

    const indexed = indexer.getIndexedEvents();
    assert.equal(indexed.length, 2);
    assert.equal(indexed[0].blockNumber, 5n);
    assert.equal(indexed[1].blockNumber, 13n);
  });

  it('4. DailyReconciliationJob detects zero discrepancy when DB, Chain, and Bank match', async () => {
    const now = new Date();
    const op = new OperationEntity({
      id: 'op-rec-001',
      freelancerId: 'free-1',
      payerNit: '900123456-1',
      payerLegalName: 'Bancolombia S.A.',
      assetType: AssetType.INVOICE,
      nominalAmountCents: 200000000n, // $ 2.000.000 COP
      termDays: 30,
      dueDate: '2026-12-31',
      advanceAmountCents: 194000000n,
      commercialDiscountCents: 4000000n,
      prooflyFeeCents: 2000000n,
      fundedCapitalCents: 194000000n,
      status: OperationStatus.SETTLED,
      hmacKey: '0xhmac_rec_001',
      createdAt: now,
      updatedAt: now
    });

    const chainProvider: ChainDataProvider = {
      async getOperationSnapshot(hmac: string) {
        return {
          tokenId: 1n,
          nominalAmountCents: 200000000n,
          settledAmountCents: 200000000n,
          isSettled: true
        };
      }
    };

    const bankProvider: BankDataProvider = {
      async getSettlementReceipts() {
        return [
          {
            transactionRef: 'ACH-REC-001',
            operationId: op.id,
            amountCents: 200000000n,
            timestamp: now
          }
        ];
      }
    };

    const mockRepo: any = {};
    const job = new DailyReconciliationJob(mockRepo, chainProvider, bankProvider);

    const report = await job.runDailyAudit([op]);

    assert.equal(report.balanced, true);
    assert.equal(report.discrepancyCents, 0n);
    assert.equal(report.auditedOperationsCount, 1);
    assert.equal(report.totalDbSettledCents, 200000000n);
    assert.equal(report.totalOnChainSettledCents, 200000000n);
    assert.equal(report.totalBankReceivedCents, 200000000n);
  });

  it('5. DailyReconciliationJob raises alert when discrepancy > $0 COP is detected', async () => {
    const now = new Date();
    const op = new OperationEntity({
      id: 'op-rec-002',
      freelancerId: 'free-2',
      payerNit: '900999888-1',
      payerLegalName: 'Globant',
      assetType: AssetType.MILESTONE,
      nominalAmountCents: 100000000n,
      termDays: 30,
      dueDate: '2026-12-31',
      advanceAmountCents: 97000000n,
      commercialDiscountCents: 2000000n,
      prooflyFeeCents: 1000000n,
      fundedCapitalCents: 97000000n,
      status: OperationStatus.SETTLED,
      hmacKey: '0xhmac_rec_002',
      createdAt: now,
      updatedAt: now
    });

    // Simular que on-chain solo se asentaron 90M en vez de 100M
    const chainProvider: ChainDataProvider = {
      async getOperationSnapshot(hmac: string) {
        return {
          tokenId: 2n,
          nominalAmountCents: 100000000n,
          settledAmountCents: 90000000n, // 10M centavos de diferencia
          isSettled: false
        };
      }
    };

    const bankProvider: BankDataProvider = {
      async getSettlementReceipts() {
        return [{
          transactionRef: 'ACH-REC-002',
          operationId: op.id,
          amountCents: 100000000n,
          timestamp: now
        }];
      }
    };

    const mockRepo: any = {};
    const job = new DailyReconciliationJob(mockRepo, chainProvider, bankProvider);

    const report = await job.runDailyAudit([op]);

    assert.equal(report.balanced, false);
    assert.ok(report.discrepancyCents > 0n);
    assert.ok(report.discrepancyDetails.length > 0);
  });
});
