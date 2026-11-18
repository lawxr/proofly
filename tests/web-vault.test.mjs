import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtUsdc, shortHash, parseUsdcInput, unitsToCents, centsToUnits, unitsRepresentable, unitsToInput } from '../apps/web/src/lib/vault.ts';
import { friendlyError } from '../apps/web/src/lib/errors.ts';

test('compact hash shows 0x + 4 and the last 8 characters', () => {
  const hash = '0xcf68030dbf20581a8441a45df9a7e8a8dcfbac40b4bcd6498192446a93eb83b4';
  assert.equal(shortHash(hash), '0xcf68…93eb83b4');
});

test('mUSDC formatting and parsing use integers only', () => {
  assert.equal(fmtUsdc(97_000_000n), '97 mUSDC');
  assert.equal(fmtUsdc('1234500000'), '1.234,5 mUSDC');
  assert.equal(parseUsdcInput('97'), 97_000_000n);
  assert.equal(parseUsdcInput('97,25'), 97_250_000n);
  assert.equal(parseUsdcInput('0'), null);
  assert.equal(parseUsdcInput('1.1234567'), null);
  assert.equal(unitsToInput(97_250_000n), '97.25');
});

test('demo rate: 1.000.000 units = 400.000 COP cents', () => {
  assert.equal(unitsToCents(1_000_000n, 4000n), 400_000n);
  assert.equal(centsToUnits(38_800_000n, 4000n), 97_000_000n);
  assert.equal(unitsRepresentable(1n, 4000n), false);
  assert.equal(unitsRepresentable(5n, 4000n), true);
});

test('backend errors map to clear Spanish messages and never to a blank one', () => {
  assert.match(friendlyError('On-chain mUSDC deposit required for this operation.'), /depósito mUSDC/);
  assert.match(friendlyError('Enter a title between 3 and 80 characters.'), /título/);
  assert.match(friendlyError('something new'), /something new/);
  assert.ok(friendlyError('').length > 0);
});
