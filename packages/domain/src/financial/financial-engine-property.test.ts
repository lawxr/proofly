import test from 'node:test';
import assert from 'node:assert/strict';
import { FinancialEngine } from './financial-engine.ts';

test('Property-based testing: Conservation of Mass in Largest Remainder allocation', () => {
  // Test over 1000 randomized iterations
  for (let i = 0; i < 1000; i++) {
    const totalCents = BigInt(Math.floor(Math.random() * 5000000000) + 1000); // 1.000 a 50M COP
    const numParticipants = Math.floor(Math.random() * 20) + 1; // 1 a 20 participantes
    
    const weights = [];
    for (let p = 0; p < numParticipants; p++) {
      weights.push({
        id: `p-${p}`,
        weight: BigInt(Math.floor(Math.random() * 1000) + 1)
      });
    }

    const allocations = FinancialEngine.allocateWithLargestRemainder(totalCents, weights);
    
    assert.equal(allocations.length, numParticipants);
    
    const allocatedSum = allocations.reduce((sum, a) => sum + a.allocatedCents, 0n);
    assert.equal(
      allocatedSum,
      totalCents,
      `Allocated sum (${allocatedSum}) must exactly equal total cents (${totalCents}) in iteration ${i}`
    );
  }
});

test('Property-based testing: Advance + Commercial Discount + Fee == Nominal Amount', () => {
  for (let i = 0; i < 1000; i++) {
    const nominalAmountCents = BigInt(Math.floor(Math.random() * 10000000000) + 100000); // 100k a 100M COP
    const termDays = Math.floor(Math.random() * 75) + 15; // 15 a 90 días
    const monthlyRate = 0.01 + Math.random() * 0.015; // 1.0% a 2.5% mensual
    const feeRate = 0.01 + Math.random() * 0.005; // 1.0% a 1.5%

    const quote = FinancialEngine.calculateQuote({
      nominalAmountCents,
      termDays,
      monthlyDiscountRate: monthlyRate,
      prooflyFeeRate: feeRate
    });

    const sum = quote.advanceAmountCents + quote.commercialDiscountCents + quote.prooflyFeeCents;
    assert.equal(
      sum,
      nominalAmountCents,
      `Breakdown sum (${sum}) must exactly equal nominal (${nominalAmountCents}) in iteration ${i}`
    );
    assert.ok(quote.effectiveAnnualRate > 0, 'Effective annual rate must be strictly positive');
  }
});
