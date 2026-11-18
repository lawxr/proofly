import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAddress, verifyMessage } from 'viem';

// Local: `npm run dev` builds the frontend and serves it on 127.0.0.1.
// Hosting: `npm run build` once, then `npm start` (this script with --no-build).
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
process.chdir(root);
try { process.loadEnvFile(resolve(root, '.env.local')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

const production = process.env.NODE_ENV === 'production';
if (production) {
  const secret = process.env.SERVER_HMAC_SECRET || '';
  if (secret.length < 32 || /default|dev-secret/i.test(secret)) {
    console.error('En producción SERVER_HMAC_SECRET debe ser propio y tener al menos 32 caracteres.');
    process.exit(1);
  }
  if (process.env.PERSISTENCE !== 'postgres') {
    console.error('En producción usa PERSISTENCE=postgres (en memoria los datos se pierden al reiniciar).');
    process.exit(1);
  }
}

if (!process.argv.includes('--no-build')) {
  const build = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'build', '--workspace', '@proofly/web'],
    { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }
  );
  if (build.status !== 0) process.exit(build.status || 1);
}

// Empty database (first deploy): create the tables from db/schema.sql.
if (process.env.PERSISTENCE === 'postgres') {
  const { ensureSchema } = await import('./db-init.mjs');
  const { created } = await ensureSchema({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' });
  if (created) console.log('Base de datos vacía: esquema creado desde db/schema.sql.');
}

const { createDependenciesFromEnv } = await import('../apps/api/src/app.ts');
const { RegisterUserUseCase, LoginUseCase, ChangePasswordUseCase, VerifyIdentityUseCase } = await import('../packages/domain/src/index.ts');
const { createAppService } = await import('./app-service.mjs');
const { createProoflyServer } = await import('../server.mjs');

const deps = createDependenciesFromEnv(process.env);
const register = new RegisterUserUseCase(deps.userRepo);
const login = new LoginUseCase(deps.userRepo);
const changePassword = new ChangePasswordUseCase(deps.userRepo);
const verifyIdentity = new VerifyIdentityUseCase(deps.userRepo, deps.kycVerifier);
// A verified user with a linked wallet is onboarded on-chain by the worker
// (on-chain KYC + demo mUSDC + a little Sepolia ETH for gas). The web server
// never holds the operator key: it only records the request in the outbox.
const vaultActive = process.env.BLOCKCHAIN_ADAPTER === 'viem' && Boolean(process.env.MOCK_USDC_ADDRESS);
const requestOnboarding = async user => {
  if (!vaultActive || !user?.walletAddress || user.kycStatus !== 'VERIFIED') return;
  await deps.outboxRepo.recordEvent({
    aggregateType: 'USER', aggregateId: user.id, eventType: 'WALLET_ONBOARDING_REQUESTED',
    payload: { userId: user.id, walletAddress: user.walletAddress }
  });
};
const verifyAndOnboard = async dto => {
  const user = await verifyIdentity.execute(dto);
  await requestOnboarding(await deps.userRepo.findById(dto.userId));
  return user;
};
const linkWallet = async ({ userId, address, signature }) => {
  if (typeof address !== 'string' || !isAddress(address) || typeof signature !== 'string') {
    throw new Error('Dirección o firma de wallet inválida.');
  }
  const message = `Proofly wallet link:${userId}`;
  const valid = await verifyMessage({ address, message, signature });
  if (!valid) throw new Error('La firma no corresponde a la wallet indicada.');
  const user = await deps.userRepo.findById(userId);
  if (!user) throw new Error('Usuario no encontrado.');
  user.walletAddress = address;
  user.updatedAt = new Date();
  await deps.userRepo.save(user);
  await requestOnboarding(user);
  return user;
};
const unlinkWallet = async ({ userId }) => {
  const user = await deps.userRepo.findById(userId);
  if (!user) throw new Error('Usuario no encontrado.');
  user.walletAddress = undefined;
  user.updatedAt = new Date();
  await deps.userRepo.save(user);
  return user;
};
// Read-only mUSDC vault ledger (no private key). Enabled with BLOCKCHAIN_ADAPTER=viem
// and MOCK_USDC_ADDRESS; the demo rate must match the deployed contract.
const { createVaultLedgerFromEnv } = await import('../apps/api/src/adapters/blockchain/viem-vault-ledger.ts');
const vaultLedger = createVaultLedgerFromEnv(process.env);
const copPerUsdc = BigInt(process.env.DEMO_COP_PER_USDC || 4000);
if (vaultLedger) {
  try {
    const onChain = await vaultLedger.copCentsPerUsdc();
    if (onChain !== copPerUsdc * 100n) {
      console.error(`DEMO_COP_PER_USDC=${copPerUsdc} no coincide con el contrato (${onChain / 100n} COP por mUSDC).`);
      process.exit(1);
    }
    console.log(`Vault mUSDC: chain ${vaultLedger.chainId} · operations ${vaultLedger.operationsAddress} · 1 mUSDC = ${copPerUsdc} COP (demo)`);
  } catch (error) {
    console.warn(`Vault mUSDC: no se pudo validar la tasa on-chain (${error?.shortMessage || error?.message}). La UI mostrará el estado como no disponible.`);
  }
}
const app = await createAppService(deps, { vaultLedger, copPerUsdc });

const server = createProoflyServer({
  appHandler: app.handle.bind(app),
  auth: { register: dto => register.execute(dto), login: dto => login.execute(dto) },
  account: { changePassword: dto => changePassword.execute(dto), verifyIdentity: verifyAndOnboard, linkWallet, unlinkWallet }
});
// Hosting needs 0.0.0.0 (HOST env); locally it stays private on 127.0.0.1.
const host = process.env.HOST || (production ? '0.0.0.0' : '127.0.0.1');
server.listen(Number(process.env.PORT || 3000), host, async () => {
  console.log(`Proofly: http://${host}:${server.address().port}`);
  console.log(`Persistencia: ${process.env.PERSISTENCE === 'postgres' ? 'Postgres' : 'memoria'}`);
  // Free hosting (one service): RUN_WORKER=true runs the outbox worker in this
  // same process. It sleeps and wakes with the web service; pending events stay
  // in PostgreSQL and are processed on wake-up. Requires OPERATOR_PRIVATE_KEY here.
  if (process.env.RUN_WORKER === 'true') {
    if (!process.env.OPERATOR_PRIVATE_KEY) {
      console.error('RUN_WORKER=true requiere OPERATOR_PRIVATE_KEY en este servicio.');
    } else {
      await import('../apps/worker/src/main.ts');
    }
  }
});
