/**
 * Verificación del outbox compartido api ↔ worker, end-to-end y real.
 *
 * 1. (API) Con Postgres, un usuario fondea por completo una operación del
 *    mercado. El dominio registra OPERATION_FULLY_FUNDED en el outbox Postgres.
 * 2. (Worker) El OutboxDispatcher lee ese MISMO outbox Postgres y despacha el
 *    evento al adaptador blockchain viem, minteando la operación on-chain.
 * 3. Se confirma que el evento quedó COMPLETED y que la operación existe
 *    on-chain en estado Funded.
 *
 * Requiere: docker compose up -d postgres; anvil + contratos desplegados.
 * Uso: PERSISTENCE=postgres BLOCKCHAIN_ADAPTER=viem \
 *      node --experimental-strip-types scripts/verify-outbox-flow.mjs
 */
import assert from 'node:assert/strict';
import { createPublicClient, http, keccak256, toHex, getContract } from 'viem';
import { createDependenciesFromEnv } from '../apps/api/src/app.ts';
import { createBlockchainAdapter } from '../apps/api/src/adapters/blockchain/blockchain-factory.ts';
import { RegisterUserUseCase } from '../packages/domain/src/index.ts';
import { createAppService } from './app-service.mjs';
import { OutboxDispatcher } from '../apps/worker/src/outbox/dispatcher.ts';
import { PROOFLY_OPERATIONS_ABI } from '@proofly/contracts-sdk';

process.env.PERSISTENCE = 'postgres';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://proofly:proofly_secret@localhost:5432/proofly_db';
process.env.BLOCKCHAIN_ADAPTER = 'viem';
process.env.RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
process.env.OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
process.env.PROOFLY_OPERATIONS_ADDRESS = process.env.PROOFLY_OPERATIONS_ADDRESS || '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512';
process.env.PROOFLY_KYC_REGISTRY_ADDRESS = process.env.PROOFLY_KYC_REGISTRY_ADDRESS || '0x5fbdb2315678afecb367f032d93f642f64180aa3';

// Shared dependencies: API and worker use the SAME Postgres-backed outbox.
const deps = createDependenciesFromEnv(process.env);
const register = new RegisterUserUseCase(deps.userRepo, deps.kycVerifier);
const app = await createAppService(deps);

// --- API side: fully fund a market operation ---
const me = await register.execute({ email: `flow-${Date.now()}@proofly.co`, legalName: 'Flujo Real', taxId: '1098765432', password: 'una-clave-segura' });
const snap = await app.snapshot(me.id);
const market = snap.operations.find(op => op.freelancerId !== me.id);
assert.ok(market, 'no market operation to fund');
await app.execute(me.id, 'participate', { id: market.id, amountCents: market.advanceAmountCents });
console.log('API ok → operación', market.id, 'fondeada por completo; evento en el outbox Postgres');

// --- Worker side: dispatch the shared outbox against the chain ---
const paymentRail = { async disburseAdvance() { return { transactionId: 'ACH-FLOW', success: true }; } };
const dispatcher = new OutboxDispatcher(deps.outboxRepo, createBlockchainAdapter(process.env), paymentRail);

// Process until the OPERATION_FULLY_FUNDED event is handled (it may share the
// batch with PARTICIPATION_PURCHASED).
let totalProcessed = 0;
for (let i = 0; i < 5; i++) {
  const { processedCount, failedCount } = await dispatcher.processBatch();
  totalProcessed += processedCount;
  assert.equal(failedCount, 0, 'worker reported a dispatch failure');
  if (processedCount === 0) break;
}
assert.ok(totalProcessed >= 1, 'worker processed no events from the shared outbox');
console.log('WORKER ok → despachados', totalProcessed, 'eventos del outbox compartido');

// --- Confirm the operation is really on-chain (Funded) ---
const publicClient = createPublicClient({ chain: { id: 84532, name: 'anvil', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [process.env.RPC_URL] } } }, transport: http(process.env.RPC_URL) });
const operations = getContract({ address: process.env.PROOFLY_OPERATIONS_ADDRESS, abi: PROOFLY_OPERATIONS_ABI, client: publicClient });
const canonicalHmac = keccak256(toHex('op:' + market.id));
const nextId = await operations.read.nextTokenId();
let found = false;
for (let id = 1n; id < nextId; id++) {
  const record = await operations.read.operations([id]);
  if (record[0] === canonicalHmac) { assert.equal(Number(record[4]), 5, 'expected Funded on-chain'); found = true; break; }
}
assert.ok(found, 'funded operation not found on-chain');

console.log('\nPASS: outbox compartido — la API fondea y registra el evento en Postgres; el worker lo lee del mismo outbox y mintea on-chain (estado Funded).');
process.exit(0);
