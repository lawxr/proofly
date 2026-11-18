/**
 * @proofly/worker - Proceso Principal del Worker Asíncrono
 *
 * Consume el outbox compartido con la API. Con PERSISTENCE=postgres ambos
 * procesos usan el mismo outbox en Postgres (patrón transactional outbox con
 * SKIP LOCKED), de modo que un evento registrado por la API se despacha aquí.
 * En memoria el outbox no se comparte entre procesos; se advierte al arrancar.
 */

import { OutboxDispatcher } from './outbox/dispatcher.ts';
import { VaultOpenReconciler } from './reconciliation/vault-open-reconciler.ts';
import type { PaymentRailPort } from '@proofly/domain';
import { createDependenciesFromEnv } from '../../api/src/app.ts';
import { createBlockchainAdapter } from '../../api/src/adapters/blockchain/blockchain-factory.ts';
import { createVaultLedgerFromEnv } from '../../api/src/adapters/blockchain/viem-vault-ledger.ts';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile(resolve(fileURLToPath(new URL('../../../.env.local', import.meta.url))));
} catch (error: unknown) {
  if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
}

const blockchainAdapter = createBlockchainAdapter(process.env);
const vaultLedger = createVaultLedgerFromEnv(process.env);
const persistence = process.env.PERSISTENCE === 'postgres' ? 'postgres' : 'memory';
const chainMode = process.env.BLOCKCHAIN_ADAPTER === 'viem' ? 'viem/on-chain' : 'mock';
const operatorAddress = (blockchainAdapter as { operatorAddress?: string }).operatorAddress;
console.log(`[Proofly Worker] Outbox Dispatcher — persistencia: ${persistence}, blockchain: ${chainMode}, vault mUSDC: ${vaultLedger ? 'activo' : 'inactivo'}`);
if (vaultLedger) {
  console.log(`[Proofly Worker] chain ${vaultLedger.chainId} · operations ${vaultLedger.operationsAddress} · operador ${operatorAddress ?? 'n/d'}`);
}
if (persistence !== 'postgres') {
  console.warn('[Proofly Worker] En memoria el outbox NO se comparte con la API (procesos separados). Usa PERSISTENCE=postgres para el flujo real.');
}

let isRunning = true;
process.on('SIGINT', () => { isRunning = false; });
process.on('SIGTERM', () => { isRunning = false; });

class StandalonePaymentRailAdapter implements PaymentRailPort {
  async disburseAdvance(params: { recipientAccount: string; amountCents: bigint; reference: string }) {
    console.log(`[Worker ACH] Desembolso simulado de ${params.amountCents} centavos COP · ref ${params.reference}`);
    return { transactionId: `ACH-WORKER-${Date.now()}`, success: true };
  }
}

const deps = createDependenciesFromEnv(process.env);
const paymentRail = new StandalonePaymentRailAdapter();
const dispatcher = new OutboxDispatcher(deps.outboxRepo, blockchainAdapter, paymentRail, {
  vaultMode: Boolean(vaultLedger),
  ledger: vaultLedger ?? undefined,
  operationRepo: deps.operationRepo,
  copPerUsdc: BigInt(process.env.DEMO_COP_PER_USDC || 4000)
});
const reconciler = vaultLedger ? new VaultOpenReconciler(deps.operationRepo, vaultLedger, dispatcher) : null;

async function loop() {
  const intervalMs = Number(process.env.WORKER_INTERVAL_MS || 3000);
  const reconcileEvery = Math.max(1, Math.round(60_000 / intervalMs));
  console.log(`[Proofly Worker] Bucle de procesamiento activo (intervalo ${intervalMs}ms).`);
  let tick = 0;
  while (isRunning) {
    try {
      const { processedCount, failedCount } = await dispatcher.processBatch();
      if (processedCount > 0) console.log(`[Proofly Worker] Despachados ${processedCount} eventos.`);
      if (failedCount > 0) console.warn(`[Proofly Worker] ${failedCount} eventos fallaron (ver last_error en outbox_events).`);
      if (reconciler && tick % reconcileEvery === 0) {
        const { opened, inconsistent } = await reconciler.run();
        if (opened > 0) console.log(`[Vault Reconciler] ${opened} operaciones abiertas on-chain.`);
        if (inconsistent > 0 && tick === 0) console.warn(`[Vault Reconciler] ${inconsistent} operaciones con meta on-chain distinta al adelanto.`);
      }
    } catch (err) {
      // RPC o base de datos temporalmente no disponibles: se reintenta en el siguiente ciclo.
      console.error('[Proofly Worker] Error en ciclo (se reintenta):', err instanceof Error ? err.message : err);
    }
    tick++;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  console.log('[Proofly Worker] Worker detenido.');
}

loop().catch(console.error);
