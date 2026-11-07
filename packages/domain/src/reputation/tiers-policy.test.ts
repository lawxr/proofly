import test from 'node:test';
import assert from 'node:assert/strict';
import { TiersPolicy, FreelancerTier } from './tiers-policy.ts';

test('TiersPolicy: newly verified freelancer starts at Tier 1 (Seed)', () => {
  const tier = TiersPolicy.determineTier(0, 70);
  assert.equal(tier, FreelancerTier.TIER_1_SEED);
  assert.equal(TiersPolicy.TIER_CONFIG[tier].maxQuotaCents, 200000000n); // $ 2.000.000 COP
});

test('TiersPolicy: 2 successful ops with good score upgrades to Tier 2 (Growth)', () => {
  const tier = TiersPolicy.determineTier(2, 75);
  assert.equal(tier, FreelancerTier.TIER_2_GROWTH);
  assert.equal(TiersPolicy.TIER_CONFIG[tier].maxQuotaCents, 800000000n); // $ 8.000.000 COP
});

test('TiersPolicy: 5+ successful ops with high score upgrades to Tier 3 (Pro)', () => {
  const tier = TiersPolicy.determineTier(6, 92);
  assert.equal(tier, FreelancerTier.TIER_3_PRO);
  assert.equal(TiersPolicy.TIER_CONFIG[tier].maxQuotaCents, 2500000000n); // $ 25.000.000 COP
});

