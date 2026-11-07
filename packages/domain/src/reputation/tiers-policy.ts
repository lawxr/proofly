/**
 * @proofly/domain - TiersPolicy
 * Reglas de asignación y progreso de cupos para freelancers.
 */

export const FreelancerTier = {
  TIER_1_SEED: 'TIER_1_SEED',       // Hasta $ 2M COP
  TIER_2_GROWTH: 'TIER_2_GROWTH',   // Hasta $ 8M COP
  TIER_3_PRO: 'TIER_3_PRO'          // Hasta $ 25M COP
} as const;

export type FreelancerTier = (typeof FreelancerTier)[keyof typeof FreelancerTier];

export interface TierLimits {
  tier: FreelancerTier;
  maxQuotaCents: bigint;
  maxActiveOperations: number;
  rateDiscountBps: number;
}

export class TiersPolicy {
  public static readonly TIER_CONFIG: Record<FreelancerTier, TierLimits> = {
    [FreelancerTier.TIER_1_SEED]: {
      tier: FreelancerTier.TIER_1_SEED,
      maxQuotaCents: 200000000n, // $ 2.000.000 COP
      maxActiveOperations: 1,
      rateDiscountBps: 0
    },
    [FreelancerTier.TIER_2_GROWTH]: {
      tier: FreelancerTier.TIER_2_GROWTH,
      maxQuotaCents: 800000000n, // $ 8.000.000 COP
      maxActiveOperations: 2,
      rateDiscountBps: 150
    },
    [FreelancerTier.TIER_3_PRO]: {
      tier: FreelancerTier.TIER_3_PRO,
      maxQuotaCents: 2500000000n, // $ 25.000.000 COP
      maxActiveOperations: 3,
      rateDiscountBps: 300
    }
  };

  public static determineTier(successfulOperationsCount: number, executionScore: number): FreelancerTier {
    if (successfulOperationsCount >= 5 && executionScore >= 85) {
      return FreelancerTier.TIER_3_PRO;
    }
    if (successfulOperationsCount >= 2 && executionScore >= 70) {
      return FreelancerTier.TIER_2_GROWTH;
    }
    return FreelancerTier.TIER_1_SEED;
  }
}
