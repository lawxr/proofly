// Prepares a class demo: a separate freelancer account with one invoice ready to
// fund (APPROVED_PENDING_FUNDING and open on-chain). Requires PostgreSQL and the
// worker running (npm run dev --workspace @proofly/worker).
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
process.loadEnvFile(resolve(root, '.env.local'));
const env = process.env;
const { createDependenciesFromEnv } = await import('../apps/api/src/app.ts');
const { createVaultLedgerFromEnv } = await import('../apps/api/src/adapters/blockchain/viem-vault-ledger.ts');
const { RegisterUserUseCase, VerifyIdentityUseCase } = await import('../packages/domain/src/index.ts');
const { createAppService } = await import('./app-service.mjs');

const EMAIL = 'demo.freelancer@proofly.co';
const PASSWORD = 'ProoflyDemo2026';
const deps = createDependenciesFromEnv(env);
const ledger = createVaultLedgerFromEnv(env);
const app = await createAppService(deps, { vaultLedger: ledger, copPerUsdc: BigInt(env.DEMO_COP_PER_USDC || 4000) });

let user = await deps.userRepo.findByEmail(EMAIL);
if (!user) {
  user = await new RegisterUserUseCase(deps.userRepo).execute({ email: EMAIL, taxId: '1037654321', password: PASSWORD });
  await new VerifyIdentityUseCase(deps.userRepo, deps.kycVerifier).execute({ userId: user.id, legalName: 'Laura Gómez Restrepo' });
}

const op = await app.execute(user.id, 'create', {
  assetType: 'INVOICE', title: 'Rediseño app móvil', payerLegalName: 'Estudio Nube SAS',
  nominalAmountCents: '200000000', termDays: 30, checks: true,
});
await app.execute(user.id, 'accept', { id: op.id, accepted: true });
console.log('Factura creada y aceptada:', op.id, op.title, '· adelanto', op.advanceAmountCents);

const deadline = Date.now() + 240_000;
let vault = null;
while (!vault && Date.now() < deadline) {
  vault = await ledger.getOperation(op.id).catch(() => null);
  if (!vault) await new Promise(r => setTimeout(r, 4000));
}
if (!vault) { console.error('El worker no abrió la operación on-chain. ¿Está corriendo?'); process.exit(1); }
console.log(JSON.stringify({ operationId: op.id, tokenId: vault.tokenId.toString(), state: vault.state, targetCents: vault.targetCents.toString(), freelancerEmail: EMAIL }));
setTimeout(() => process.exit(0), 300);
