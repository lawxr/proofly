/**
 * @proofly/domain - Use Case: Adquirir Participación por Financiador
 */

import { InvestmentEntity, InvestmentStatus } from '../models/investment.ts';
import { OperationEntity } from '../models/operation.ts';
import { OperationStatus, OperationStateMachine } from '../state/operation-state.ts';
import type { OperationRepositoryPort } from '../ports/operation-repository.port.ts';
import type { InvestmentRepositoryPort } from '../ports/investment-repository.port.ts';
import type { UserRepositoryPort } from '../ports/user-repository.port.ts';
import type { OutboxRepositoryPort } from '../ports/outbox-repository.port.ts';

export interface PurchaseParticipationDto {
  operationId: string;
  investorId: string;
  fundedCapitalCents: bigint;
}

export interface PurchaseParticipationResult {
  investment: InvestmentEntity;
  operation: OperationEntity;
  isFullyFunded: boolean;
}

export class PurchaseParticipationUseCase {
  operationRepo: OperationRepositoryPort;
  investmentRepo: InvestmentRepositoryPort;
  userRepo: UserRepositoryPort;
  outboxRepo: OutboxRepositoryPort;

  constructor(
    operationRepo: OperationRepositoryPort,
    investmentRepo: InvestmentRepositoryPort,
    userRepo: UserRepositoryPort,
    outboxRepo: OutboxRepositoryPort
  ) {
    this.operationRepo = operationRepo;
    this.investmentRepo = investmentRepo;
    this.userRepo = userRepo;
    this.outboxRepo = outboxRepo;
  }

  async execute(dto: PurchaseParticipationDto): Promise<PurchaseParticipationResult> {
    const investor = await this.userRepo.findById(dto.investorId);
    if (!investor) {
      throw new Error(`Investor with id ${dto.investorId} not found`);
    }

    if (!investor.isKycVerified()) {
      throw new Error('Investor must be KYC verified to purchase participations (Invariant I6)');
    }

    const operation = await this.operationRepo.findById(dto.operationId);
    if (!operation) {
      throw new Error(`Operation ${dto.operationId} not found`);
    }

    if (operation.status !== OperationStatus.APPROVED_PENDING_FUNDING) {
      throw new Error(
        `Operation is not open for funding. Current status: ${operation.status}, expected APPROVED_PENDING_FUNDING`
      );
    }

    if (dto.fundedCapitalCents <= 0n) {
      throw new Error('Funded capital must be greater than zero');
    }

    const remaining = operation.remainingFundingCents();
    if (dto.fundedCapitalCents > remaining) {
      throw new Error(
        `Investment amount (${dto.fundedCapitalCents} cents) exceeds available remaining funding (${remaining} cents)`
      );
    }

    const investmentId = crypto.randomUUID();
    const now = new Date();

    // 1 token ERC-1155 = 1 centavo de COP
    const tokensCount = dto.fundedCapitalCents;

    const investment = new InvestmentEntity({
      id: investmentId,
      operationId: operation.id,
      investorId: investor.id,
      fundedCapitalCents: dto.fundedCapitalCents,
      tokensCount,
      status: InvestmentStatus.CONFIRMED,
      createdAt: now
    });

    operation.fundedCapitalCents += dto.fundedCapitalCents;
    operation.updatedAt = now;

    let fullyFunded = false;
    if (operation.isFullyFunded()) {
      fullyFunded = true;
      OperationStateMachine.assertCanTransition(operation.status, OperationStatus.ACTIVE_FUNDED);
      operation.status = OperationStatus.ACTIVE_FUNDED;
    }

    await this.investmentRepo.save(investment);
    await this.operationRepo.save(operation);

    // Evento outbox de participación
    await this.outboxRepo.recordEvent({
      aggregateType: 'INVESTMENT',
      aggregateId: investment.id,
      eventType: 'PARTICIPATION_PURCHASED',
      payload: {
        investmentId: investment.id,
        operationId: operation.id,
        investorId: investor.id,
        fundedCapitalCents: investment.fundedCapitalCents.toString(),
        tokensCount: investment.tokensCount.toString()
      }
    });

    // Si se completó el 100%, registrar evento outbox para gatillar el minteo en Base y desembolso al freelancer
    if (fullyFunded) {
      await this.outboxRepo.recordEvent({
        aggregateType: 'OPERATION',
        aggregateId: operation.id,
        eventType: 'OPERATION_FULLY_FUNDED',
        payload: {
          operationId: operation.id,
          freelancerId: operation.freelancerId,
          totalFundedCents: operation.fundedCapitalCents.toString(),
          advanceAmountCents: operation.advanceAmountCents.toString(),
          hmacKey: operation.hmacKey
        }
      });
    }

    return {
      investment,
      operation,
      isFullyFunded: fullyFunded
    };
  }
}
