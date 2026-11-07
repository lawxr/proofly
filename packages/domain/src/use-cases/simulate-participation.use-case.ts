/**
 * @proofly/domain - Use Case: Simular Participación para Financiador
 */

import type { OperationRepositoryPort } from '../ports/operation-repository.port.ts';

export interface SimulateParticipationDto {
  operationId: string;
  amountToFundCents: bigint;
}

export interface ParticipationSimulationResult {
  operationId: string;
  fundedCapitalCents: bigint;
  expectedGrossReturnCents: bigint;
  netEstimatedProfitCents: bigint;
  totalEstimatedPayoutCents: bigint;
  effectiveAnnualRate: number;
  expectedDueDate: string;
}

export class SimulateParticipationUseCase {
  operationRepo: OperationRepositoryPort;

  constructor(operationRepo: OperationRepositoryPort) {
    this.operationRepo = operationRepo;
  }

  async execute(dto: SimulateParticipationDto): Promise<ParticipationSimulationResult> {
    const operation = await this.operationRepo.findById(dto.operationId);
    if (!operation) {
      throw new Error(`Operation ${dto.operationId} not found`);
    }

    if (dto.amountToFundCents <= 0n) {
      throw new Error('Amount to fund must be greater than zero');
    }

    const remaining = operation.remainingFundingCents();
    if (dto.amountToFundCents > remaining) {
      throw new Error(
        `Amount to fund (${dto.amountToFundCents} cents) exceeds remaining available funding (${remaining} cents)`
      );
    }

    // Cálculo proporcional de ganancia estimada
    const share = Number(dto.amountToFundCents) / Number(operation.advanceAmountCents);
    const estimatedProfitCents = BigInt(Math.floor(Number(operation.commercialDiscountCents) * share));
    const totalPayout = dto.amountToFundCents + estimatedProfitCents;

    // Calcular E.A. normalizada a 360 días
    const returnRate = Number(estimatedProfitCents) / Number(dto.amountToFundCents);
    const exponent = 360 / operation.termDays;
    const effectiveAnnualRate = Math.round((Math.pow(1 + returnRate, exponent) - 1) * 10000) / 10000;

    return {
      operationId: operation.id,
      fundedCapitalCents: dto.amountToFundCents,
      expectedGrossReturnCents: estimatedProfitCents,
      netEstimatedProfitCents: estimatedProfitCents,
      totalEstimatedPayoutCents: totalPayout,
      effectiveAnnualRate,
      expectedDueDate: operation.dueDate
    };
  }
}
