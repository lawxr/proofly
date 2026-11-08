/**
 * Verificación end-to-end del worker contra la cadena real (Anvil).
 *
 * Arma el OutboxDispatcher real con el adaptador blockchain seleccionado por
 * la fábrica (BLOCKCHAIN_ADAPTER=viem) y un payment rail mock, inyecta un
 * evento OPERATION_FULLY_FUNDED en un outbox en memoria, y confirma que el
 * dispatcher mintea la operación on-chain de verdad y marca el evento como
 * completado.
 *
 * Uso: BLOCKCHAIN_ADAPTER=viem node --experimental-strip-types scripts/verify-worker-chain.mjs
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPublicClient, http, keccak256, toHex, getContract } from 'viem';
import { OutboxEvent, OutboxStatus } from '@proofly/domain';
import { PROOFLY_OPERATIONS_ABI } from '@proofly/contracts-sdk';
import { OutboxDispatcher } from '../apps/worker/src/outbox/dispatcher.ts';
import { createBlockchainAdapter } from '../apps/api/src/adapters/blockchain/blockchain-factory.ts';

process.env.BLOCKCHAIN_ADAPTER = process.env.BLOCKCHAIN_ADAPTER || 'viem';
process.env.RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
process.env.OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
process.env.PROOFLY_OPERATIONS_ADDRESS = process.env.PROOFLY_OPERATIONS_ADDRESS || '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512';
process.env.PROOFLY_KYC_REGISTRY_ADDRESS = process.env.PROOFLY_KYC_REGISTRY_ADDRESS || '0x5fbdb2315678afecb367f032d93f642f64180aa3';

const rpcUrl = process.env.RPC_URL;
const operationsAddress = process.env.PROOFLY_OPERATIONS_ADDRESS;

// Minimal in-memory outbox for the verification.
class MemoryOutbox {
  events = [];
  async recordEvent(e) { const ev = new OutboxEvent({ id: randomUUID(), aggregateType: e.aggregateType, aggregateId: e.aggregateId, eventType: e.eventType, payload: e.payload, status: OutboxStatus.PENDING, retryCount: 0, createdAt: new Date() }); this.events.push(ev); return ev; }
  async fetchPendingEvents(n) { return this.events.filter(e => e.status === OutboxStatus.PENDING).slice(0, n); }
  async markCompleted(id) { const e = this.events.find(ev => ev.id === id); if (e) { e.status = OutboxStatus.COMPLETED; e.processedAt = new Date(); } }
  async markFailed(id, reason) { const e = this.events.find(ev => ev.id === id); if (e) { e.status = OutboxStatus.FAILED; e.lastError = reason; e.retryCount++; } }
}
const paymentRail = { async disburseAdvance() { return { transactionId: 'ACH-VERIFY', success: true }; } };

const outbox = new MemoryOutbox();
const blockchain = createBlockchainAdapter(process.env);
const dispatcher = new OutboxDispatcher(outbox, blockchain, paymentRail);

const operationId = randomUUID();
const nominal = '150000000';
await outbox.recordEvent({
  aggregateType: 'OPERATION', aggregateId: operationId, eventType: 'OPERATION_FULLY_FUNDED',
  payload: { operationId, freelancerId: 'freelancer-x', totalFundedCents: nominal, advanceAmountCents: '144000000', hmacKey: 'demo-hmac' }
});

const { processedCount, failedCount } = await dispatcher.processBatch();
assert.equal(failedCount, 0, 'dispatcher reported a failure');
assert.equal(processedCount, 1, 'event was not processed');
assert.equal(outbox.events[0].status, OutboxStatus.COMPLETED, 'event not marked completed');

// Confirm the operation really exists on-chain in Funded state.
const publicClient = createPublicClient({ chain: { id: 84532, name: 'anvil', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } }, transport: http(rpcUrl) });
const operations = getContract({ address: operationsAddress, abi: PROOFLY_OPERATIONS_ABI, client: publicClient });
const canonicalHmac = keccak256(toHex('op:' + operationId));
const nextId = await operations.read.nextTokenId();
let found = false;
for (let id = 1n; id < nextId; id++) {
  const record = await operations.read.operations([id]);
  if (record[0] === canonicalHmac) { assert.equal(record[2], BigInt(nominal)); assert.equal(Number(record[4]), 5); found = true; break; }
}
assert.ok(found, 'minted operation not found on-chain');

console.log('PASS: worker → OutboxDispatcher → ViemBlockchainAdapter minteó OPERATION_FULLY_FUNDED on-chain (estado Funded) y marcó el evento COMPLETED.');
