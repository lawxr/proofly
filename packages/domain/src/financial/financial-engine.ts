/**
 * @proofly/domain - FinancialEngine
 * Implementación matemática pura con aritmética entera estricta en centavos de COP.
 */

export interface QuoteCalculationInput {
  nominalAmountCents: bigint;
  termDays: number;
  monthlyDiscountRate: number; // ej. 0.0200 para 2.0%
  prooflyFeeRate?: number;     // ej. 0.0100 para 1.0%
  maxLegalUsuryRateBps?: number; // ej. 3200 para 32.0% E.A.
}

export interface QuoteCalculationResult {
  nominalAmountCents: bigint;
  termDays: number;
  periodDiscountRate: number;
  commercialDiscountCents: bigint;
  prooflyFeeCents: bigint;
  advanceAmountCents: bigint;
  fundedCapitalCents: bigint;
  effectiveAnnualRate: number;
}

export interface ShareAllocation {
  id: string;
  exactShare: number;
  allocatedCents: bigint;
}

export class FinancialEngine {
  /**
   * Calcula la cotización exacta para el freelancer y los financiadores.
   */
  public static calculateQuote(input: QuoteCalculationInput): QuoteCalculationResult {
    if (input.nominalAmountCents <= 0n) {
      throw new Error('Nominal amount must be greater than zero');
    }
    if (input.termDays < 15 || input.termDays > 90) {
      throw new Error('Term days must be between 15 and 90');
    }

    const feeRate = input.prooflyFeeRate ?? 0.0100;
    const periodDiscountRate = (input.monthlyDiscountRate * input.termDays) / 30;

    // Descuento en centavos enteros truncados
    const commercialDiscountCents = BigInt(
      Math.floor(Number(input.nominalAmountCents) * periodDiscountRate)
    );

    // Fee de Proofly en centavos enteros truncados
    const prooflyFeeCents = BigInt(
      Math.floor(Number(input.nominalAmountCents) * feeRate)
    );

    // Adelanto neto que recibe el freelancer
    const advanceAmountCents = input.nominalAmountCents - commercialDiscountCents - prooflyFeeCents;
    if (advanceAmountCents <= 0n) {
      throw new Error('Calculated advance amount is invalid or non-positive');
    }

    // Capital financiado por financiadores
    const fundedCapitalCents = input.nominalAmountCents - commercialDiscountCents;

    // Tasa Efectiva Anual (E.A.) para el financiador normalizada a 360 días
    const returnRate = Number(commercialDiscountCents) / Number(fundedCapitalCents);
    const exponent = 360 / input.termDays;
    let effectiveAnnualRate = Math.pow(1 + returnRate, exponent) - 1;

    // Control de límite de usura si aplica
    if (input.maxLegalUsuryRateBps) {
      const maxRate = input.maxLegalUsuryRateBps / 10000;
      if (effectiveAnnualRate > maxRate) {
        effectiveAnnualRate = maxRate;
      }
    }

    return {
      nominalAmountCents: input.nominalAmountCents,
      termDays: input.termDays,
      periodDiscountRate,
      commercialDiscountCents,
      prooflyFeeCents,
      advanceAmountCents,
      fundedCapitalCents,
      effectiveAnnualRate: Math.round(effectiveAnnualRate * 10000) / 10000
    };
  }

  /**
   * Distribución pro-rata en centavos enteros mediante el Algoritmo del Mayor Resto (Hamilton-Hare).
   * Garantiza que la suma de cuotas sea idéntica al total a distribuir (0 centavos de residuo).
   */
  public static allocateWithLargestRemainder(
    totalCents: bigint,
    weights: Array<{ id: string; weight: bigint }>
  ): ShareAllocation[] {
    const sumWeights = weights.reduce((acc, w) => acc + w.weight, 0n);
    if (sumWeights === 0n) {
      throw new Error('Weight sum cannot be zero');
    }

    let allocatedSum = 0n;
    const intermediate = weights.map(w => {
      const exact = (Number(w.weight) / Number(sumWeights)) * Number(totalCents);
      const baseCents = BigInt(Math.floor(exact));
      allocatedSum += baseCents;
      return {
        id: w.id,
        exact,
        baseCents,
        remainder: exact - Math.floor(exact)
      };
    });

    const remainderCents = totalCents - allocatedSum;

    // Ordenar de mayor a menor residuo decimal
    intermediate.sort((a, b) => b.remainder - a.remainder);

    return intermediate.map((item, index) => {
      const extraCent = index < Number(remainderCents) ? 1n : 0n;
      return {
        id: item.id,
        exactShare: item.exact,
        allocatedCents: item.baseCents + extraCent
      };
    });
  }
}

