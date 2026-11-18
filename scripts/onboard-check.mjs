// Verifies wallet onboarding on Sepolia with a throwaway address:
// on-chain KYC + demo mUSDC + a small ETH top-up. Prints only public data.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

process.loadEnvFile(resolve(fileURLToPath(new URL('..', import.meta.url)), '.env.local'));
const { createBlockchainAdapter } = await import('../apps/api/src/adapters/blockchain/blockchain-factory.ts');
const { createVaultLedgerFromEnv } = await import('../apps/api/src/adapters/blockchain/viem-vault-ledger.ts');
const adapter = createBlockchainAdapter(process.env);
const ledger = createVaultLedgerFromEnv(process.env);
const wallet = privateKeyToAccount(generatePrivateKey()).address;
const params = { walletAddress: wallet, minUsdcUnits: 100_000_000n, mintUsdcUnits: 1_000_000_000n, minEthWei: 5_000_000_000_000_000n, topUpEthWei: 1_000_000_000_000_000n };
const first = await adapter.onboardDemoWallet(params);
const again = await adapter.onboardDemoWallet(params);
const after = await ledger.getWallet(wallet);
console.log(JSON.stringify({ wallet, first, again, after: { kyc: after.kycVerified, usdcUnits: String(after.usdcUnits) } }, null, 2));
