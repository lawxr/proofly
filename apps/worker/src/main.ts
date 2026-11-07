/**
 * @proofly/worker - Proceso Principal del Worker Asíncrono
 */

import { OutboxDispatcher } from './outbox/dispatcher.ts';
import { EVMEventIndexer, ChainLogProvider, RawLogEvent } from './indexer/evm-indexer.ts';
import { DailyReconciliationJob, ChainDataProvider, BankDataProvider } from './reconciliation/daily-job.ts';
import { OutboxEvent, OutboxStatus } from '@proofly/domain';
import type { OutboxRepositoryPort, BlockchainPort, PaymentRailPort } from '@proofly/domain';

console.log('[Proofly Worker] Inicializando Outbox Dispatcher, EVM Indexer y Conciliador Diario...');

let isRunning = true;
process.on('SIGINT', () => { isRunning = false; });
process.on('SIGTERM', () => { isRunning = false; });

// Mocks locales para ejecución en segundo plano
class StandaloneBlockchainAdapter implements BlockchainPort {
  async mintOperationTokens(params: { operationId: string; toAddress: string; amountTokens: bigint }) {
    console.log(`[Worker EVM] Minteando ${params.amountTokens} tokens en Base L2 para op ${params.operationId}`);
    return { txHash: `0xworker${Date.now()}`, success: true };
  }
  async burnOperationTokens(params: { operationId: string; receiptHash: string }) {
    console.log(`[Worker EVM] Quemando tokens en Base L2 con recibo ${params.receiptHash}`);
    return { txHash: `0xburn${Date.now()}`, success: true };
  }
}

class StandalonePaymentRailAdapter implements PaymentRailPort {
  async disburseAdvance(params: { recipientAccount: string; amountCents: bigint; reference: string }) {
    console.log(`[Worker ACH] Desembolsando ${params.amountCents} centavos a ${params.recipientAccount}`);
    return { transactionId: `ACH-WORKER-${Date.now()}`, success: true };
  }
}

class InMemoryOutboxWorkerRepo implements OutboxRepositoryPort {
  private events: OutboxEvent[] = [];

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

const outboxRepo = new InMemoryOutboxWorkerRepo();
const blockchain = new StandaloneBlockchainAdapter();
const paymentRail = new StandalonePaymentRailAdapter();
const dispatcher = new OutboxDispatcher(outboxRepo, blockchain, paymentRail);

async function loop() {
  console.log('[Proofly Worker] Bucle de procesamiento activo (intervalo 3s).');
  while (isRunning) {
    try {
      const { processedCount } = await dispatcher.processBatch();
      if (processedCount > 0) {
        console.log(`[Proofly Worker] Despachados ${processedCount} eventos exitosamente.`);
      }
    } catch (err) {
      console.error('[Proofly Worker] Error en ciclo:', err);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log('[Proofly Worker] Worker detenido.');
}

loop().catch(console.error);
