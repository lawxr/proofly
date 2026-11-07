/**
 * @proofly/domain - Use Case: Simular Cotización
 */

import { FinancialEngine } from '../financial/financial-engine.ts';
import type { QuoteCalculationResult } from '../financial/financial-engine.ts';

export interface SimulateQuoteDto {
  nominalAmountCents: bigint;
  termDays: number;
  monthlyDiscountRate?: number;
}

export class SimulateQuoteUseCase {
  execute(dto: SimulateQuoteDto): QuoteCalculationResult {
    const monthlyRate = dto.monthlyDiscountRate ?? 0.0200; // 2.0% mensual base
    return FinancialEngine.calculateQuote({
      nominalAmountCents: dto.nominalAmountCents,
      termDays: dto.termDays,
      monthlyDiscountRate: monthlyRate,
      prooflyFeeRate: 0.0100
    });
  }
}
