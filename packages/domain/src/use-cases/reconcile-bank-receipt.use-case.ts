/**
 * @proofly/domain - Use Case: Conciliación Bancaria y Cascada Waterfall
 */

import { OperationEntity } from '../models/operation.ts';
import { OperationStatus, OperationStateMachine } from '../state/operation-state.ts';
import { FinancialEngine } from '../financial/financial-engine.ts';
import type { OperationRepositoryPort } from '../ports/operation-repository.port.ts';
import type { InvestmentRepositoryPort } from '../ports/investment-repository.port.ts';
import type { OutboxRepositoryPort } from '../ports/outbox-repository.port.ts';

export interface ReconcileBankReceiptDto {
  operationId: string;
  bankReceiptHash: string;
  receivedAmountCents: bigint;
  bankTransactionRef: string;
}

export interface InvestorSettlementDistribution {
  investorId: string;
  capitalReturnedCents: bigint;
  profitEarnedCents: bigint;
  totalDistributedCents: bigint;
}

export interface SettlementResult {
  operationId: string;
  isFullySettled: boolean;
  receivedAmountCents: bigint;
  prooflyFeeRetainedCents: bigint;
  investorDistributions: InvestorSettlementDistribution[];
  remainingUnpaidCents: bigint;
  newStatus: OperationStatus;
}

export class ReconcileBankReceiptUseCase {
  operationRepo: OperationRepositoryPort;
  investmentRepo: InvestmentRepositoryPort;
  outboxRepo: OutboxRepositoryPort;

  constructor(
    operationRepo: OperationRepositoryPort,
    investmentRepo: InvestmentRepositoryPort,
    outboxRepo: OutboxRepositoryPort
  ) {
    this.operationRepo = operationRepo;
    this.investmentRepo = investmentRepo;
    this.outboxRepo = outboxRepo;
  }

  async execute(dto: ReconcileBankReceiptDto): Promise<SettlementResult> {
    const operation = await this.operationRepo.findById(dto.operationId);
    if (!operation) {
      throw new Error(`Operation ${dto.operationId} not found`);
    }

    if (
      operation.status !== OperationStatus.DISBURSED &&
      operation.status !== OperationStatus.ACTIVE_FUNDED &&
      operation.status !== OperationStatus.PARTIALLY_SETTLED_OVERDUE
    ) {
      throw new Error(
        `Cannot settle operation in status ${operation.status}. Expected DISBURSED or ACTIVE_FUNDED`
      );
    }

    if (dto.receivedAmountCents <= 0n) {
      throw new Error('Received amount must be greater than zero');
    }

    const investments = await this.investmentRepo.findByOperationId(operation.id);
    if (investments.length === 0) {
      throw new Error(`No investments found for operation ${operation.id}`);
    }

    // Cascada Waterfall (Invariante I12, ADR-0003)
    let availableCents = dto.receivedAmountCents;

    // Prioridad 1: Retención de comisión de Proofly
    let prooflyFeeRetainedCents = 0n;
    if (availableCents >= operation.prooflyFeeCents) {
      prooflyFeeRetainedCents = operation.prooflyFeeCents;
      availableCents -= operation.prooflyFeeCents;
    } else {
      prooflyFeeRetainedCents = availableCents;
      availableCents = 0n;
    }

    // Prioridad 2: Devolución de capital financiado a los financiadores (Pro-rata exacto)
    const weights = investments.map(inv => ({
      id: inv.investorId,
      weight: inv.fundedCapitalCents
    }));

    const totalCapitalNeeded = operation.advanceAmountCents;
    const capitalToDistribute = availableCents >= totalCapitalNeeded ? totalCapitalNeeded : availableCents;

    const capitalAllocations = FinancialEngine.allocateWithLargestRemainder(capitalToDistribute, weights);
    availableCents -= capitalToDistribute;

    // Prioridad 3: Ganancia / Descuento comercial para los financiadores
    let profitAllocations: Array<{ id: string; allocatedCents: bigint }> = [];
    if (availableCents > 0n) {
      const profitToDistribute = availableCents >= operation.commercialDiscountCents
        ? operation.commercialDiscountCents
        : availableCents;
      profitAllocations = FinancialEngine.allocateWithLargestRemainder(profitToDistribute, weights);
      availableCents -= profitToDistribute;
    }

    // Construir tabla de distribución por inversionista
    const investorDistributions: InvestorSettlementDistribution[] = investments.map(inv => {
      const cap = capitalAllocations.find(a => a.id === inv.investorId)?.allocatedCents ?? 0n;
      const prof = profitAllocations.find(a => a.id === inv.investorId)?.allocatedCents ?? 0n;
      return {
        investorId: inv.investorId,
        capitalReturnedCents: cap,
        profitEarnedCents: prof,
        totalDistributedCents: cap + prof
      };
    });

    const isFullySettled = dto.receivedAmountCents >= operation.nominalAmountCents;
    const targetStatus = isFullySettled
      ? OperationStatus.SETTLED
      : OperationStatus.PARTIALLY_SETTLED_OVERDUE;

    // Validar transición en la máquina de estados
    // Si la operación estaba en ACTIVE_FUNDED, primero pasó lógicamente por DISBURSED
    if (operation.status === OperationStatus.ACTIVE_FUNDED) {
      operation.status = OperationStatus.DISBURSED;
    }
    OperationStateMachine.assertCanTransition(operation.status, targetStatus);
    operation.status = targetStatus;
    operation.updatedAt = new Date();

    await this.operationRepo.save(operation);

    const remainingUnpaidCents = operation.nominalAmountCents > dto.receivedAmountCents
      ? operation.nominalAmountCents - dto.receivedAmountCents
      : 0n;

    // Registrar evento en outbox para que el worker de blockchain queme los tokens ERC-1155
    await this.outboxRepo.recordEvent({
      aggregateType: 'OPERATION',
      aggregateId: operation.id,
      eventType: isFullySettled ? 'OPERATION_SETTLED' : 'OPERATION_PARTIALLY_SETTLED',
      payload: {
        operationId: operation.id,
        bankReceiptHash: dto.bankReceiptHash,
        receivedAmountCents: dto.receivedAmountCents.toString(),
        bankTransactionRef: dto.bankTransactionRef,
        isFullySettled,
        newStatus: operation.status
      }
    });

    return {
      operationId: operation.id,
      isFullySettled,
      receivedAmountCents: dto.receivedAmountCents,
      prooflyFeeRetainedCents,
      investorDistributions,
      remainingUnpaidCents,
      newStatus: operation.status
    };
  }
}
