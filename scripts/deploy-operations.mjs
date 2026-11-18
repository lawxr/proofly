// Deploys only ProoflyOperations (corrected) reusing the existing KYC registry
// and MockUSDC. Signs with OPERATOR_PRIVATE_KEY from .env.local (never printed),
// regenerates the SDK ABI and updates the operations address in .env.local.
import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createPublicClient, createWalletClient, http, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const envPath = resolve(root, '.env.local');
process.loadEnvFile(envPath);
const env = process.env;
if (Number(env.CHAIN_ID) !== 11155111) throw new Error('Refusing to deploy: CHAIN_ID is not Sepolia.');

const artifact = JSON.parse(readFileSync(resolve(root, 'contracts/out/ProoflyOperations.sol/ProoflyOperations.json'), 'utf8'));
const account = privateKeyToAccount(env.OPERATOR_PRIVATE_KEY.trim());
const transport = http(env.RPC_URL, { retryCount: 5, retryDelay: 1000, timeout: 60_000 });
const pub = createPublicClient({ chain: sepolia, transport });
const wallet = createWalletClient({ account, chain: sepolia, transport });
const kyc = getAddress(env.PROOFLY_KYC_REGISTRY_ADDRESS);
const usdc = getAddress(env.MOCK_USDC_ADDRESS);

const args = [account.address, kyc, usdc];
const estimate = await pub.estimateGas({ account, data: (await import('viem')).encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode.object, args }), blockTag: 'latest' });
const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode.object, args, gas: (estimate * 13n) / 10n });
const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 300_000 });
if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error(`Deploy failed: ${hash}`);
const address = getAddress(receipt.contractAddress);

// SDK ABI used by the API ledger and the worker.
writeFileSync(resolve(root, 'packages/contracts-sdk/src/abis/ProoflyOperations.json'), JSON.stringify(artifact.abi, null, 2) + '\n');

// Replace only the two operations-address lines; every other line (including the key) is untouched.
const text = readFileSync(envPath, 'utf8');
const updated = text
  .replace(/^PROOFLY_OPERATIONS_ADDRESS=.*$/m, `PROOFLY_OPERATIONS_ADDRESS=${address}`)
  .replace(/^VITE_PROOFLY_OPERATIONS_ADDRESS=.*$/m, `VITE_PROOFLY_OPERATIONS_ADDRESS=${address}`);
writeFileSync(envPath, updated);

console.log(JSON.stringify({ operations: address, txHash: hash, block: receipt.blockNumber.toString(), owner: account.address, kyc, mockUsdc: usdc }, null, 2));
