// Read-only preflight: derives the operator address from .env.local (never prints the key)
// and checks contract ownership/roles needed for the end-to-end Sepolia run.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicClient, http, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { PROOFLY_OPERATIONS_ABI, MOCK_USDC_ABI } from '../packages/contracts-sdk/src/index.ts';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
process.loadEnvFile(resolve(root, '.env.local'));
const env = process.env;
const key = (env.OPERATOR_PRIVATE_KEY || '').trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) { console.error('OPERATOR_PRIVATE_KEY missing or malformed (value not shown).'); process.exit(1); }
const operator = privateKeyToAccount(key).address;
const client = createPublicClient({ transport: http(env.RPC_URL, { retryCount: 4 }) });
const ops = getAddress(env.PROOFLY_OPERATIONS_ADDRESS);
const usdc = getAddress(env.MOCK_USDC_ADDRESS);
const read = (address, abi, functionName, args = []) => client.readContract({ address, abi, functionName, args });
console.log(JSON.stringify({
  operator,
  chainId: await client.getChainId(),
  usdcOwner: await read(usdc, MOCK_USDC_ABI, 'owner'),
  opsOwner: await read(ops, PROOFLY_OPERATIONS_ABI, 'owner'),
  operatorIsOperator: await read(ops, PROOFLY_OPERATIONS_ABI, 'operators', [operator]),
  operatorIsReconciler: await read(ops, PROOFLY_OPERATIONS_ABI, 'reconcilers', [operator]),
  copCentsPerUsdc: String(await read(ops, PROOFLY_OPERATIONS_ABI, 'COP_CENTS_PER_USDC')),
}, null, 2));
