import test from 'node:test';
import assert from 'node:assert/strict';
import { RegisterUserUseCase, VerifyIdentityUseCase } from '../packages/domain/src/index.ts';
import { createAppService } from '../scripts/app-service.mjs';

// Build a shared in-memory deps, register a real user, and drive the app
// service scoped to that user (meId comes from the session in production).
async function setup() {
  const { createDependencies: make } = await import('../apps/api/src/app.ts');
  const deps = make();
  const register = new RegisterUserUseCase(deps.userRepo, () => 'me-' + Math.random().toString(16).slice(2));
  const me = await register.execute({ email: `me-${Date.now()}@proofly.co`, taxId: '1098765432', password: 'una-clave-segura' });
  // KYC is required before operating: verify identity right after sign-up.
  await new VerifyIdentityUseCase(deps.userRepo, deps.kycVerifier).execute({ userId: me.id, legalName: 'Persona Real' });
  const app = await createAppService(deps);
  return { app, meId: me.id, deps };
}

test('one identity owns operations and invests in the market through the full lifecycle', async () => {
  const { app, meId } = await setup();
  const before = await app.snapshot(meId);
  assert.ok(before.me && before.me.id === meId);
  assert.equal(before.freelancer, undefined);
  assert.equal(before.investor, undefined);
  assert.equal(before.operations.length, 2);
  assert.ok(before.operations.every(op => op.freelancerId !== meId), 'Market is supplied by other people.');
  assert.ok(before.operations.every(op => BigInt(op.prooflyFeeCents) > 0n));

  // Invest in someone else's operation.
  const market = before.operations[0];
  const projection = await app.execute(meId, 'participate', { id: market.id, amountCents: market.advanceAmountCents });
  assert.ok(BigInt(projection.netEstimatedProfitCents) > 0n);
  let state = await app.snapshot(meId);
  assert.equal(state.operations.find(item => item.id === market.id).status, 'ACTIVE_FUNDED');
  assert.equal(state.investments.length, 1);
  const settled = await app.execute(meId, 'settle', { id: market.id });
  assert.equal(settled.isFullySettled, true);

  // Raise on an own operation; cannot invest in it.
  const input = { assetType: 'MILESTONE', title: 'Hito de diseño', payerLegalName: 'Cliente', nominalAmountCents: '100000000', termDays: 45, checks: true };
  const op = await app.execute(meId, 'create', input);
  assert.equal(op.status, 'PENDING_CLIENT_CONFIRMATION');
  assert.equal(op.advanceAmountCents, '96000000');
  await app.execute(meId, 'confirm', { id: op.id });
  await assert.rejects(app.execute(meId, 'accept', { id: op.id, accepted: false }));
  await app.execute(meId, 'accept', { id: op.id, accepted: true });
  await assert.rejects(app.execute(meId, 'participate', { id: op.id, amountCents: '48000000' }), /own operation/);

  // A market counterparty funds the own operation so it can settle.
  await app.execute(meId, 'participate', { id: op.id, amountCents: '96000000', counterparty: true });
  state = await app.snapshot(meId);
  assert.equal(state.operations.find(item => item.id === op.id).status, 'ACTIVE_FUNDED');
  const result = await app.execute(meId, 'settle', { id: op.id });
  assert.equal(result.isFullySettled, true);
  assert.equal(result.investorDistributions.reduce((sum, item) => sum + BigInt(item.totalDistributedCents), 0n) + BigInt(result.prooflyFeeRetainedCents), 100000000n);
  const invoice = await app.execute(meId, 'create', { ...input, assetType: 'INVOICE', title: 'Factura', termDays: 30 });
  assert.equal(invoice.status, 'QUOTED');
});

test('rejected creation preserves data and concurrent funding cannot overfill an operation', async () => {
  const { app, meId } = await setup();
  const state = await app.snapshot(meId);
  await assert.rejects(app.execute(meId, 'create', { assetType: 'INVOICE', title: 'Sin eventos', nominalAmountCents: '100000000', termDays: 30, checks: false }));
  assert.deepEqual(await app.snapshot(meId), state);
  const target = state.operations[0];
  const result = await Promise.allSettled([
    app.execute(meId, 'participate', { id: target.id, amountCents: target.advanceAmountCents }),
    app.execute(meId, 'participate', { id: target.id, amountCents: target.advanceAmountCents, counterparty: true }),
  ]);
  assert.equal(result.filter(item => item.status === 'fulfilled').length, 1);
  const after = await app.snapshot(meId);
  assert.equal(after.operations.find(item => item.id === target.id).fundedCapitalCents, target.advanceAmountCents);
});

test('a new user starts at seed tier and progresses with settled operations', async () => {
  const { app, meId, deps } = await setup();
  // Fresh account: seed tier, one active operation allowed.
  const start = await app.snapshot(meId);
  assert.equal(start.me.tier, 'TIER_1_SEED');

  // Settle two own operations (funded by a market counterparty) to progress.
  for (let i = 0; i < 2; i++) {
    const op = await app.execute(meId, 'create', { assetType: 'MILESTONE', title: `Hito ${i}`, nominalAmountCents: '50000000', termDays: 30, checks: true });
    await app.execute(meId, 'confirm', { id: op.id });
    await app.execute(meId, 'accept', { id: op.id, accepted: true });
    await app.execute(meId, 'participate', { id: op.id, amountCents: op.advanceAmountCents, counterparty: true });
    await app.execute(meId, 'settle', { id: op.id });
  }
  const me = await deps.userRepo.findById(meId);
  assert.equal(me.tier, 'TIER_2_GROWTH', 'two settled operations should reach growth tier');
});

test('a seed user cannot hold two active operations at once', async () => {
  const { app, meId } = await setup();
  await app.execute(meId, 'create', { assetType: 'MILESTONE', title: 'Primera', nominalAmountCents: '50000000', termDays: 30, checks: true });
  await assert.rejects(
    app.execute(meId, 'create', { assetType: 'INVOICE', title: 'Segunda', nominalAmountCents: '50000000', termDays: 30, checks: true }),
    /active operation limit/i,
    'seed tier allows only one active operation'
  );
});

test('two different users see their own operations and investments separately', async () => {
  const { createDependencies: make } = await import('../apps/api/src/app.ts');
  const deps = make();
  const register = new RegisterUserUseCase(deps.userRepo);
  const verify = new VerifyIdentityUseCase(deps.userRepo, deps.kycVerifier);
  const a = await register.execute({ email: 'ana.ruiz@proofly.co', taxId: '1000000001', password: 'una-clave-segura' });
  const b = await register.execute({ email: 'beto.diaz@proofly.co', taxId: '1000000002', password: 'una-clave-segura' });
  await verify.execute({ userId: a.id, legalName: 'Ana Ruiz Gómez' });
  await verify.execute({ userId: b.id, legalName: 'Beto Díaz Pérez' });
  const app = await createAppService(deps);

  const market = (await app.snapshot(a.id)).operations[0];
  await app.execute(a.id, 'participate', { id: market.id, amountCents: '1000000' });

  const snapA = await app.snapshot(a.id);
  const snapB = await app.snapshot(b.id);
  assert.equal(snapA.investments.length, 1);
  assert.equal(snapB.investments.length, 0, 'B must not see A\'s investments');
  assert.equal(snapA.me.name, 'Ana Ruiz Gómez'); // verified legal name from KYC
  assert.equal(snapB.me.name, 'Beto Díaz Pérez');
});
