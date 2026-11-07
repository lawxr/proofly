import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from '../src/data/repository.js';
const memory = () => { const data = new Map(); return { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) }; };
const invoice = { id: 'DEMO-100', amount: 1000000, issuer: 'Demo', payer: 'Demo', dueDate: '2026-12-18', checks: { validated: true, received: true, delivered: true, accepted: true } };
test('repository seeds twenty invoices and returns isolated snapshots', () => {
  const repo = createRepository(memory());
  assert.equal(repo.list().length, 20);
  const list = repo.list(); list[0].status = 'changed';
  assert.equal(repo.list()[0].status, 'funded');
});
test('new invoices persist; duplicate and rejected transitions leave records unchanged', () => {
  const storage = memory(); const repo = createRepository(storage);
  repo.add(invoice);
  assert.equal(createRepository(storage).list().length, 21);
  const before = JSON.stringify([repo.list(), repo.events()]);
  assert.throws(() => repo.add({ ...invoice, id: 'demo-100' }));
  assert.throws(() => repo.act(invoice.id, 'settle'));
  assert.equal(JSON.stringify([repo.list(), repo.events()]), before);
  repo.act(invoice.id, 'fund'); repo.act(invoice.id, 'settle');
  assert.equal(repo.list()[0].status, 'settled');
  assert.equal(repo.events().length, 4);
  assert.throws(() => repo.act(invoice.id, 'settle'));
});
test('ineligible invoices are retained with rejection status', () => {
  const repo = createRepository(memory());
  assert.equal(repo.add({ ...invoice, dueDate: '2026-01-01' }).status, 'rejected');
});
test('corrupt or unavailable storage degrades to an in-memory demo', () => {
  const repo = createRepository({ getItem: () => '{', setItem() { throw Error('denied'); } });
  assert.equal(repo.list().length, 20);
  repo.add(invoice);
  assert.equal(repo.list().length, 21);
  assert.equal(repo.isPersistent(), false);
});
