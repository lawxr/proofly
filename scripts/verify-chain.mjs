/**
 * Verificación de la primera conexión blockchain real (Anvil).
 *
 * Ejercita el ViemBlockchainAdapter contra los contratos desplegados:
 *  1. Mintea una operación on-chain (registro ERC-1155 real, con KYC on-chain).
 *  2. Lee el estado on-chain y confirma que la operación quedó en Funded.
 *  3. Liquida la operación y confirma el estado Settled.
 *
 * Requiere Anvil en marcha y los contratos desplegados. Las direcciones y la
 * clave del operador se leen del entorno, con los valores por defecto de Anvil.
 *
 * Uso: node --experimental-strip-types scripts/verify-chain.mjs
 */

import assert from 'node:assert/strict';
import { createPublicClient, http, keccak256, toHex, getContract } from 'viem';
import { PROOFLY_OPERATIONS_ABI } from '@proofly/contracts-sdk';
import { ViemBlockchainAdapter } from '../apps/api/src/adapters/blockchain/viem-blockchain-adapter.ts';

const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';
const chainId = Number(process.env.CHAIN_ID || 84532);
const operatorPrivateKey = process.env.OPERATOR_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const operationsAddress = process.env.PROOFLY_OPERATIONS_ADDRESS || '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512';
const kycRegistryAddress = process.env.PROOFLY_KYC_REGISTRY_ADDRESS || '0x5fbdb2315678afecb367f032d93f642f64180aa3';

const adapter = new ViemBlockchainAdapter({ rpcUrl, chainId, operatorPrivateKey, operationsAddress, kycRegistryAddress });
const publicClient = createPublicClient({ chain: { id: chainId, name: 'anvil', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } }, transport: http(rpcUrl) });
const operations = getContract({ address: operationsAddress, abi: PROOFLY_OPERATIONS_ABI, client: publicClient });

const operationId = 'op-verify-' + Date.now();
const nominal = 250000000n;

// 1. Mint real on-chain.
const mint = await adapter.mintOperationTokens({ operationId, toAddress: '0x', amountTokens: nominal });
assert.equal(mint.success, true, `mint failed: ${mint.txHash}`);
console.log('MINT ok →', mint.txHash);

// 2. Confirmar estado on-chain (Funded = 5 en el enum OperationState).
const canonicalHmac = keccak256(toHex('op:' + operationId));
const nextId = await operations.read.nextTokenId();
let tokenId = 0n;
for (let id = 1n; id < nextId; id++) {
  const record = await operations.read.operations([id]);
  if (record[0] === canonicalHmac) { tokenId = id; break; }
}
assert.ok(tokenId > 0n, 'operation not found on chain after mint');
let record = await operations.read.operations([tokenId]);
assert.equal(record[2], nominal, 'on-chain nominal mismatch');
assert.equal(Number(record[4]), 5, `expected Funded state, got ${record[4]}`);
console.log('STATE ok → tokenId', tokenId.toString(), 'Funded, nominal', record[2].toString());

// 3. Settle real on-chain.
const burn = await adapter.burnOperationTokens({ operationId, receiptHash: 'bank-receipt-abc123' });
assert.equal(burn.success, true, `settle failed: ${burn.txHash}`);
record = await operations.read.operations([tokenId]);
assert.equal(Number(record[4]), 7, `expected Settled state, got ${record[4]}`);
console.log('SETTLE ok →', burn.txHash, '· state Settled, settled', record[5].toString());

console.log('\nPASS: conexión blockchain real contra Anvil — mint + estado Funded + settle + estado Settled, todo on-chain.');
