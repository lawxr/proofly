import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateApp } from '../scripts/private-app.mjs';

test('one identity owns operations and invests in the market through the full lifecycle', async () => {
  const app = await createPrivateApp();
  const before = await app.snapshot();
  // The signed-in person is exposed once, with both balances; no separate identities.
  assert.ok(before.me && before.me.id);
  assert.equal(before.freelancer, undefined);
  assert.equal(before.investor, undefined);
  assert.equal(before.operations.length, 2);
  assert.ok(before.operations.every(op => op.freelancerId !== before.me.id), 'Market is supplied by other people.');
  assert.ok(before.operations.every(op => BigInt(op.prooflyFeeCents) > 0n));

  // The person invests in someone else's operation (allowed) and sees it in the portfolio.
  const market = before.operations[0];
  const projection = await app.execute('participate', { id: market.id, amountCents: market.advanceAmountCents });
  assert.ok(BigInt(projection.netEstimatedProfitCents) > 0n);
  let state = await app.snapshot();
  assert.equal(state.operations.find(item => item.id === market.id).status, 'ACTIVE_FUNDED');
  assert.equal(state.investments.length, 1);
  const settled = await app.execute('settle', { id: market.id });
  assert.equal(settled.isFullySettled, true);

  // The person raises on their own operation, but cannot invest in it.
  const input = { assetType: 'MILESTONE', title: 'Hito de diseño', payerLegalName: 'Cliente', nominalAmountCents: '100000000', termDays: 45, checks: true };
  const op = await app.execute('create', input);
  assert.equal(op.status, 'PENDING_CLIENT_CONFIRMATION');
  assert.equal(op.advanceAmountCents, '96000000');
  assert.equal(op.prooflyFeeCents, '1000000');
  await app.execute('confirm', { id: op.id });
  await assert.rejects(app.execute('accept', { id: op.id, accepted: false }));
  await app.execute('accept', { id: op.id, accepted: true });
  await assert.rejects(app.execute('participate', { id: op.id, amountCents: '48000000' }), /own operation/);

  // A market counterparty funds the person's own operation so it can settle.
  state = await app.snapshot();
  assert.equal(state.operations.find(item => item.id === op.id).status, 'APPROVED_PENDING_FUNDING');
  const unchanged = JSON.stringify(state);
  await assert.rejects(app.execute('participate', { id: op.id, amountCents: '999999999999', counterparty: true }));
  assert.equal(JSON.stringify(await app.snapshot()), unchanged);
  await app.execute('participate', { id: op.id, amountCents: '96000000', counterparty: true });
  state = await app.snapshot();
  assert.equal(state.operations.find(item => item.id === op.id).status, 'ACTIVE_FUNDED');
  const result = await app.execute('settle', { id: op.id });
  assert.equal(result.isFullySettled, true);
  assert.equal(result.investorDistributions.reduce((sum, item) => sum + BigInt(item.totalDistributedCents), 0n) + BigInt(result.prooflyFeeRetainedCents), 100000000n);
  const final = JSON.stringify(await app.snapshot());
  await assert.rejects(app.execute('settle', { id: op.id }));
  assert.equal(JSON.stringify(await app.snapshot()), final);
  const invoice = await app.execute('create', { ...input, assetType: 'INVOICE', title: 'Factura', termDays: 30 });
  assert.equal(invoice.status, 'QUOTED');
});

test('rejected creation preserves data and concurrent funding cannot overfill an operation', async () => {
  const app = await createPrivateApp();
  const state = await app.snapshot();
  await assert.rejects(app.execute('create', { assetType: 'INVOICE', title: 'Sin eventos', nominalAmountCents: '100000000', termDays: 30, checks: false }));
  assert.deepEqual(await app.snapshot(), state);
  const target = state.operations[0];
  const result = await Promise.allSettled([
    app.execute('participate', { id: target.id, amountCents: target.advanceAmountCents }),
    app.execute('participate', { id: target.id, amountCents: target.advanceAmountCents, counterparty: true }),
  ]);
  assert.equal(result.filter(item => item.status === 'fulfilled').length, 1);
  const after = await app.snapshot();
  assert.equal(after.operations.find(item => item.id === target.id).fundedCapitalCents, target.advanceAmountCents);
});

test('own-operation tier progression settles through a market counterparty', async () => {
  const app = await createPrivateApp();
  for (const kind of ['INVOICE', 'MILESTONE']) {
    const op = await app.execute('create', { assetType: kind, title: `Nivel ${kind}`, nominalAmountCents: '100000000', termDays: 30, checks: true });
    if (kind === 'MILESTONE') await app.execute('confirm', { id: op.id });
    await app.execute('accept', { id: op.id, accepted: true });
    // The owner cannot fund their own operation; a market counterparty does.
    await app.execute('participate', { id: op.id, amountCents: op.advanceAmountCents, counterparty: true });
    await app.execute('settle', { id: op.id });
  }
  const { me } = await app.snapshot();
  assert.equal(me.tier, 'TIER_2_GROWTH');
  assert.equal(me.availableLimitCents, '800000000');
});
