/**
 * @proofly/domain - Use Case: Confirmar Hito Contractual por Cliente Pagador
 */

import { OperationEntity } from '../models/operation.ts';
import { OperationStatus, OperationStateMachine } from '../state/operation-state.ts';
import type { OperationRepositoryPort } from '../ports/operation-repository.port.ts';
import type { OutboxRepositoryPort } from '../ports/outbox-repository.port.ts';

export interface ConfirmMilestoneDto {
  token: string;
  confirmedByIp?: string;
}

export class ConfirmMilestoneUseCase {
  operationRepo: OperationRepositoryPort;
  outboxRepo: OutboxRepositoryPort;

  constructor(operationRepo: OperationRepositoryPort, outboxRepo: OutboxRepositoryPort) {
    this.operationRepo = operationRepo;
    this.outboxRepo = outboxRepo;
  }

  async execute(dto: ConfirmMilestoneDto): Promise<OperationEntity> {
    const operation = await this.operationRepo.findByConfirmationToken(dto.token);
    if (!operation) {
      throw new Error(`Operation with confirmation token ${dto.token} not found`);
    }

    if (operation.status !== OperationStatus.PENDING_CLIENT_CONFIRMATION) {
      throw new Error(
        `Cannot confirm milestone: operation is in state ${operation.status}, expected PENDING_CLIENT_CONFIRMATION`
      );
    }

    // Validar transición canónica de máquina de estados
    OperationStateMachine.assertCanTransition(operation.status, OperationStatus.QUOTED);

    operation.status = OperationStatus.QUOTED;
    operation.updatedAt = new Date();

    await this.operationRepo.save(operation);

    await this.outboxRepo.recordEvent({
      aggregateType: 'OPERATION',
      aggregateId: operation.id,
      eventType: 'MILESTONE_CONFIRMED_BY_PAYER',
      payload: {
        operationId: operation.id,
        confirmedByIp: dto.confirmedByIp ?? 'unknown',
        newStatus: operation.status
      }
    });

    return operation;
  }
}
