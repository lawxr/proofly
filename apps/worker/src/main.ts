/**
 * @proofly/worker - Proceso Principal del Worker Asíncrono
 */

import { OutboxDispatcher } from './outbox/dispatcher.ts';
import { EVMEventIndexer, ChainLogProvider, RawLogEvent } from './indexer/evm-indexer.ts';
import { DailyReconciliationJob, ChainDataProvider, BankDataProvider } from './reconciliation/daily-job.ts';
import { OutboxEvent, OutboxStatus } from '@proofly/domain';
import type { OutboxRepositoryPort, PaymentRailPort } from '@proofly/domain';
import { createBlockchainAdapter } from '../../api/src/adapters/blockchain/blockchain-factory.ts';

const blockchainAdapter = createBlockchainAdapter(process.env);
console.log(`[Proofly Worker] Inicializando Outbox Dispatcher (blockchain: ${process.env.BLOCKCHAIN_ADAPTER === 'viem' ? 'viem/on-chain' : 'mock'})...`);

let isRunning = true;
process.on('SIGINT', () => { isRunning = false; });
process.on('SIGTERM', () => { isRunning = false; });

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
const paymentRail = new StandalonePaymentRailAdapter();
const dispatcher = new OutboxDispatcher(outboxRepo, blockchainAdapter, paymentRail);

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
