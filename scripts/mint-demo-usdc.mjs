// Mints demo MockUSDC (no value) to a wallet. Usage: node scripts/mint-demo-usdc.mjs 0xWallet 1000
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicClient, createWalletClient, http, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { MOCK_USDC_ABI } from '../packages/contracts-sdk/src/index.ts';

process.loadEnvFile(resolve(fileURLToPath(new URL('..', import.meta.url)), '.env.local'));
const [to, whole] = process.argv.slice(2);
if (!to || !/^\d+$/.test(whole || '')) throw new Error('Usage: mint-demo-usdc.mjs 0xWallet <whole mUSDC>');
const account = privateKeyToAccount(process.env.OPERATOR_PRIVATE_KEY.trim());
const transport = http(process.env.RPC_URL, { retryCount: 5, retryDelay: 1000 });
const pub = createPublicClient({ chain: sepolia, transport });
const wallet = createWalletClient({ account, chain: sepolia, transport });
const address = getAddress(process.env.MOCK_USDC_ADDRESS);
const args = [getAddress(to), BigInt(whole) * 1_000_000n];
const gas = (await pub.estimateContractGas({ account, address, abi: MOCK_USDC_ABI, functionName: 'mint', args, blockTag: 'latest' })) * 3n / 2n;
const hash = await wallet.writeContract({ address, abi: MOCK_USDC_ABI, functionName: 'mint', args, gas });
const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 180_000 });
const balance = await pub.readContract({ address, abi: MOCK_USDC_ABI, functionName: 'balanceOf', args: [args[0]], blockNumber: receipt.blockNumber });
console.log(JSON.stringify({ to: args[0], minted: whole + ' mUSDC', txHash: hash, status: receipt.status, balanceUnits: balance.toString() }));
