/**
 * @proofly/domain - Use Case: Aceptar Cotización y Firmar Cesión
 */

import { OperationEntity } from '../models/operation.ts';
import { OperationStatus, OperationStateMachine } from '../state/operation-state.ts';
import type { OperationRepositoryPort } from '../ports/operation-repository.port.ts';
import type { OutboxRepositoryPort } from '../ports/outbox-repository.port.ts';

export interface AcceptQuoteDto {
  operationId: string;
  freelancerId: string;
  electronicSignatureHash: string;
}

export class AcceptQuoteUseCase {
  operationRepo: OperationRepositoryPort;
  outboxRepo: OutboxRepositoryPort;

  constructor(operationRepo: OperationRepositoryPort, outboxRepo: OutboxRepositoryPort) {
    this.operationRepo = operationRepo;
    this.outboxRepo = outboxRepo;
  }

  async execute(dto: AcceptQuoteDto): Promise<OperationEntity> {
    const operation = await this.operationRepo.findById(dto.operationId);
    if (!operation) {
      throw new Error(`Operation ${dto.operationId} not found`);
    }

    if (operation.freelancerId !== dto.freelancerId) {
      throw new Error(`Unauthorized: operation ${dto.operationId} does not belong to freelancer ${dto.freelancerId}`);
    }

    if (!dto.electronicSignatureHash || dto.electronicSignatureHash.trim() === '') {
      throw new Error('Electronic signature hash is mandatory to sign cession');
    }

    if (operation.status !== OperationStatus.QUOTED) {
      throw new Error(
        `Cannot accept quote: operation is in state ${operation.status}, expected QUOTED`
      );
    }

    // Validar transición canónica
    OperationStateMachine.assertCanTransition(operation.status, OperationStatus.APPROVED_PENDING_FUNDING);

    operation.status = OperationStatus.APPROVED_PENDING_FUNDING;
    operation.electronicSignatureHash = dto.electronicSignatureHash;
    operation.updatedAt = new Date();

    await this.operationRepo.save(operation);

    await this.outboxRepo.recordEvent({
      aggregateType: 'OPERATION',
      aggregateId: operation.id,
      eventType: 'OPERATION_LISTED_ON_MARKETPLACE',
      payload: {
        operationId: operation.id,
        signatureHash: dto.electronicSignatureHash,
        nominalAmountCents: operation.nominalAmountCents.toString(),
        advanceAmountCents: operation.advanceAmountCents.toString(),
        newStatus: operation.status
      }
    });

    return operation;
  }
}
