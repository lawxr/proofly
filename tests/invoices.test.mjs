import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, quote, transition } from '../src/domain/invoices.js';
const now = '2026-11-03';
const invoice = { id: 'FV-1001', amount: 1000000, dueDate: '2026-12-18', checks: { validated: true, received: true, delivered: true, accepted: true }, status: 'available' };
test('eligibility requires all simulated events and a future due date', () => {
  assert.equal(evaluate(invoice, now).eligible, true);
  assert.equal(evaluate({ ...invoice, checks: { ...invoice.checks, accepted: false } }, now).eligible, false);
  assert.equal(evaluate({ ...invoice, dueDate: now }, now).eligible, false);
});
test('quote shows the requested monthly discount and all costs', () => {
  assert.deepEqual(quote(1000000, 45), { amount: 1000000, days: 45, rate: 0.02, discount: 30000, fee: 0, net: 970000 });
  assert.throws(() => quote(-1, 45));
  assert.throws(() => quote(1, 0));
});
test('only available invoices can be funded and funding precedes one-time settlement', () => {
  const funded = transition(invoice, 'fund', now);
  assert.equal(funded.status, 'funded');
  assert.equal(invoice.status, 'available');
  assert.throws(() => transition(funded, 'fund', now));
  const settled = transition(funded, 'settle', now);
  assert.equal(settled.status, 'settled');
  assert.throws(() => transition(settled, 'settle', now));
  assert.throws(() => transition(invoice, 'settle', now));
  assert.throws(() => transition({ ...invoice, dueDate: now }, 'fund', now));
});
