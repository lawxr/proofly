import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCufe, verifyCufe, type CufeFields } from './cufe.ts';

const sample: CufeFields = {
  numFac: 'FE12345',
  fecFac: '2026-11-07',
  horFac: '10:30:00-05:00',
  valFac: '1000000.00',
  codImp1: '01', valImp1: '190000.00',
  codImp2: '04', valImp2: '0.00',
  codImp3: '03', valImp3: '0.00',
  valTot: '1190000.00',
  nitOFE: '901234567',
  numAdq: '1098765432',
  clTec: 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c',
  tipoAmbiente: '2'
};

// Known vector: this exact field set must always produce this exact CUFE.
const EXPECTED = 'c93ae10136ffa6ca98367d43f98e22e3ca51190a9798bf303a275510023394c1f40ad2a86f3deebd60c5d678a152df45';

test('computeCufe matches the known vector and is 96 hex chars', () => {
  const cufe = computeCufe(sample);
  assert.equal(cufe, EXPECTED);
  assert.match(cufe, /^[0-9a-f]{96}$/);
});

test('computeCufe is deterministic', () => {
  assert.equal(computeCufe(sample), computeCufe({ ...sample }));
});

test('changing any single field changes the hash', () => {
  for (const key of Object.keys(sample) as (keyof CufeFields)[]) {
    const altered = { ...sample, [key]: sample[key] + 'X' };
    assert.notEqual(computeCufe(altered), EXPECTED, `field ${key} should affect the CUFE`);
  }
});

test('verifyCufe accepts the declared CUFE (case-insensitive) and rejects a tampered one', () => {
  assert.equal(verifyCufe(EXPECTED, sample), true);
  assert.equal(verifyCufe(EXPECTED.toUpperCase(), sample), true);
  assert.equal(verifyCufe('  ' + EXPECTED + '  ', sample), true);
  assert.equal(verifyCufe(EXPECTED, { ...sample, valTot: '9999999.00' }), false);
  assert.equal(verifyCufe('not-a-real-cufe', sample), false);
});
