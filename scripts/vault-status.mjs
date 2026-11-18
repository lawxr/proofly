// Read-only snapshot of the MockUSDC vault on the configured EVM network.
// Never signs or prints private keys. Usage:
//   node scripts/vault-status.mjs [operationId ...] [--wallet 0x...]
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicClient, http, keccak256, toHex, getAddress } from 'viem';
import { PROOFLY_OPERATIONS_ABI, MOCK_USDC_ABI, PROOFLY_KYC_REGISTRY_ABI } from '../packages/contracts-sdk/src/index.ts';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
try { process.loadEnvFile(resolve(root, '.env.local')); } catch (error) { if (error.code !== 'ENOENT') throw error; }

const env = process.env;
const ops = getAddress(env.PROOFLY_OPERATIONS_ADDRESS);
const usdc = getAddress(env.MOCK_USDC_ADDRESS);
const kyc = getAddress(env.PROOFLY_KYC_REGISTRY_ADDRESS);
const client = createPublicClient({ transport: http(env.RPC_URL, { retryCount: 5, retryDelay: 800 }) });
const read = (address, abi, functionName, args = []) => client.readContract({ address, abi, functionName, args });
const STATES = ['Draft', 'PendingConfirmation', 'PendingVerification', 'Quoted', 'OpenForFunding', 'Funded', 'Disbursed', 'Settled', 'OverduePartial', 'Cancelled'];

const args = process.argv.slice(2);
const wallets = [];
const operationIds = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--wallet') wallets.push(getAddress(args[++i]));
  else operationIds.push(args[i]);
}
for (const w of [env.PROOFLY_FINANCIER_ADDRESS]) if (w && !wallets.includes(getAddress(w))) wallets.push(getAddress(w));

const out = {
  chainId: await client.getChainId(),
  operations: ops,
  mockUsdc: usdc,
  nextTokenId: String(await read(ops, PROOFLY_OPERATIONS_ABI, 'nextTokenId')),
  vaultUsdcUnits: String(await read(usdc, MOCK_USDC_ABI, 'balanceOf', [ops])),
  wallets: [],
  tokens: [],
};
for (const w of wallets) {
  out.wallets.push({
    address: w,
    kyc: await read(kyc, PROOFLY_KYC_REGISTRY_ABI, 'isKycVerified', [w]),
    usdcUnits: String(await read(usdc, MOCK_USDC_ABI, 'balanceOf', [w])),
    allowanceUnits: String(await read(usdc, MOCK_USDC_ABI, 'allowance', [w, ops])),
    ethWei: String(await client.getBalance({ address: w })),
  });
}
for (const id of operationIds) {
  const hmac = keccak256(toHex('op:' + id));
  const tokenId = await read(ops, PROOFLY_OPERATIONS_ABI, 'hmacToTokenId', [hmac]);
  const entry = { operationId: id, hmac, tokenId: String(tokenId) };
  if (tokenId > 0n) {
    const record = await read(ops, PROOFLY_OPERATIONS_ABI, 'operations', [tokenId]);
    entry.targetCents = String(record[2]);
    entry.state = STATES[Number(record[4])] || String(record[4]);
    entry.settledCents = String(record[5]);
    entry.fundedCents = String(await read(ops, PROOFLY_OPERATIONS_ABI, 'fundedCentsByOperation', [tokenId]));
    entry.fundedUsdcUnits = String(await read(ops, PROOFLY_OPERATIONS_ABI, 'fundedUsdcByOperation', [tokenId]));
    entry.profitPoolUsdcUnits = String(await read(ops, PROOFLY_OPERATIONS_ABI, 'settlementPoolUsdcByOperation', [tokenId]));
    entry.holders = [];
    for (const w of wallets) {
      entry.holders.push({
        address: w,
        shares: String(await read(ops, PROOFLY_OPERATIONS_ABI, 'balanceOf', [w, tokenId])),
        claimableUsdcUnits: String(await read(ops, PROOFLY_OPERATIONS_ABI, 'claimableUsdc', [tokenId, w])),
      });
    }
  }
  out.tokens.push(entry);
}
console.log(JSON.stringify(out, null, 2));
