/**
 * @proofly/worker - Proceso Principal del Worker Asíncrono
 *
 * Consume el outbox compartido con la API. Con PERSISTENCE=postgres ambos
 * procesos usan el mismo outbox en Postgres (patrón transactional outbox con
 * SKIP LOCKED), de modo que un evento registrado por la API se despacha aquí.
 * En memoria el outbox no se comparte entre procesos; se advierte al arrancar.
 */

import { OutboxDispatcher } from './outbox/dispatcher.ts';
import type { PaymentRailPort } from '@proofly/domain';
import { createDependenciesFromEnv } from '../../api/src/app.ts';
import { createBlockchainAdapter } from '../../api/src/adapters/blockchain/blockchain-factory.ts';

const blockchainAdapter = createBlockchainAdapter(process.env);
const persistence = process.env.PERSISTENCE === 'postgres' ? 'postgres' : 'memory';
const chainMode = process.env.BLOCKCHAIN_ADAPTER === 'viem' ? 'viem/on-chain' : 'mock';
console.log(`[Proofly Worker] Outbox Dispatcher — persistencia: ${persistence}, blockchain: ${chainMode}`);
if (persistence !== 'postgres') {
  console.warn('[Proofly Worker] En memoria el outbox NO se comparte con la API (procesos separados). Usa PERSISTENCE=postgres para el flujo real.');
}

let isRunning = true;
process.on('SIGINT', () => { isRunning = false; });
process.on('SIGTERM', () => { isRunning = false; });

class StandalonePaymentRailAdapter implements PaymentRailPort {
  async disburseAdvance(params: { recipientAccount: string; amountCents: bigint; reference: string }) {
    console.log(`[Worker ACH] Desembolsando ${params.amountCents} centavos a ${params.recipientAccount}`);
    return { transactionId: `ACH-WORKER-${Date.now()}`, success: true };
  }
}

const deps = createDependenciesFromEnv(process.env);
const paymentRail = new StandalonePaymentRailAdapter();
const dispatcher = new OutboxDispatcher(deps.outboxRepo, blockchainAdapter, paymentRail);

async function loop() {
  const intervalMs = Number(process.env.WORKER_INTERVAL_MS || 3000);
  console.log(`[Proofly Worker] Bucle de procesamiento activo (intervalo ${intervalMs}ms).`);
  while (isRunning) {
    try {
      const { processedCount, failedCount } = await dispatcher.processBatch();
      if (processedCount > 0) console.log(`[Proofly Worker] Despachados ${processedCount} eventos.`);
      if (failedCount > 0) console.warn(`[Proofly Worker] ${failedCount} eventos fallaron (reintento pendiente).`);
    } catch (err) {
      console.error('[Proofly Worker] Error en ciclo:', err);
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  console.log('[Proofly Worker] Worker detenido.');
}

loop().catch(console.error);
