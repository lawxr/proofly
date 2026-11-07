import test from 'node:test';
import assert from 'node:assert/strict';
import { FinancialEngine } from './financial-engine.ts';

test('FinancialEngine Scenario 1: Freelancer Tier 1 - Hito corto 15 días ($ 1.000.000 COP)', () => {
  const result = FinancialEngine.calculateQuote({
    nominalAmountCents: 100000000n, // $ 1.000.000 COP
    termDays: 15,
    monthlyDiscountRate: 0.0210,
    prooflyFeeRate: 0.0100
  });

  assert.equal(result.commercialDiscountCents, 1050000n); // $ 10.500 COP
  assert.equal(result.prooflyFeeCents, 1000000n);          // $ 10.000 COP
  assert.equal(result.advanceAmountCents, 97950000n);       // $ 979.500 COP
  assert.equal(result.fundedCapitalCents, 98950000n);       // $ 989.500 COP
  assert.equal(result.effectiveAnnualRate, 0.2883);         // 28.83 % E.A. exacto con doble precisión
});

test('FinancialEngine Scenario 2: Algoritmo del Mayor Resto (60% y 40% sin pérdida de centavos)', () => {
  const allocations = FinancialEngine.allocateWithLargestRemainder(200000000n, [
    { id: 'financier-1', weight: 60n },
    { id: 'financier-2', weight: 40n }
  ]);

  assert.equal(allocations.length, 2);
  assert.equal(allocations[0].allocatedCents, 120000000n); // $ 1.200.000 COP
  assert.equal(allocations[1].allocatedCents, 80000000n);  // $ 800.000 COP
  assert.equal(allocations[0].allocatedCents + allocations[1].allocatedCents, 200000000n);
});

test('FinancialEngine Scenario 6: Pago Parcial (60%) entre 3 financiadores iguales sin pérdida de centavos', () => {
  // $ 6.000.000 COP (600.000.000 centavos) entre 3 partes de peso 1
  const allocations = FinancialEngine.allocateWithLargestRemainder(600000000n, [
    { id: 'F1', weight: 1n },
    { id: 'F2', weight: 1n },
    { id: 'F3', weight: 1n }
  ]);

  assert.equal(allocations.length, 3);
  assert.equal(allocations[0].allocatedCents, 200000000n);
  assert.equal(allocations[1].allocatedCents, 200000000n);
  assert.equal(allocations[2].allocatedCents, 200000000n);
  const total = allocations.reduce((sum, a) => sum + a.allocatedCents, 0n);
  assert.equal(total, 600000000n);
});
