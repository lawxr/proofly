/**
 * @proofly/domain - Use Case: Crear Operación por Hito Contractual (Milestone)
 */

import { OperationEntity, AssetType } from '../models/operation.ts';
import { OperationStatus } from '../state/operation-state.ts';
import { AntiDuplicateService } from '../security/anti-duplicate.ts';
import { FinancialEngine } from '../financial/financial-engine.ts';
import type { OperationRepositoryPort } from '../ports/operation-repository.port.ts';
import type { UserRepositoryPort } from '../ports/user-repository.port.ts';
import type { OutboxRepositoryPort } from '../ports/outbox-repository.port.ts';
import type { MilestoneConfirmationPort } from '../ports/external-services.port.ts';

export interface CreateMilestoneOperationDto {
  freelancerId: string;
  contractUuid: string;
  milestoneIndex: number;
  title: string;
  deliverableUrl: string;
  payerNit: string;
  payerLegalName: string;
  payerEmail: string;
  nominalAmountCents: bigint;
  termDays: number;
  dueDate: string;
  monthlyDiscountRate?: number;
}

export class CreateMilestoneOperationUseCase {
  operationRepo: OperationRepositoryPort;
  userRepo: UserRepositoryPort;
  outboxRepo: OutboxRepositoryPort;
  milestoneNotifier: MilestoneConfirmationPort;
  antiDuplicateService: AntiDuplicateService;

  constructor(
    operationRepo: OperationRepositoryPort,
    userRepo: UserRepositoryPort,
    outboxRepo: OutboxRepositoryPort,
    milestoneNotifier: MilestoneConfirmationPort,
    serverSecret: string
  ) {
    this.operationRepo = operationRepo;
    this.userRepo = userRepo;
    this.outboxRepo = outboxRepo;
    this.milestoneNotifier = milestoneNotifier;
    this.antiDuplicateService = new AntiDuplicateService(serverSecret);
  }

  async execute(dto: CreateMilestoneOperationDto): Promise<OperationEntity> {
    const user = await this.userRepo.findById(dto.freelancerId);
    if (!user) {
      throw new Error(`Freelancer with id ${dto.freelancerId} not found`);
    }

    if (!user.isKycVerified()) {
      throw new Error('Freelancer must be KYC verified to originate operations');
    }

    // 1. Verificar cupo disponible del freelancer (Invariante I13)
    if (user.availableLimitCents !== undefined && user.availableLimitCents < dto.nominalAmountCents) {
      throw new Error(
        `Nominal amount (${dto.nominalAmountCents} cents) exceeds available limit (${user.availableLimitCents} cents)`
      );
    }

    // 2. Generar HMAC canónico anti-duplicados de hito (Invariante I4)
    const dueDateUnix = Math.floor(new Date(dto.dueDate).getTime() / 1000);
    const hmacHex = this.antiDuplicateService.generateMilestoneHmac({
      contractUuid: dto.contractUuid,
      milestoneIndex: dto.milestoneIndex,
      payerId: dto.payerNit,
      nominalAmountCents: dto.nominalAmountCents,
      dueDateUnix
    });
    const hmacKey = '0x' + hmacHex;

    const existing = await this.operationRepo.findByHmac(hmacKey);
    if (existing) {
      throw new Error(`Duplicate milestone detected. Operation with HMAC ${hmacKey} already exists`);
    }

    // 3. Calcular cotización financiera
    let termDays = dto.termDays;
    if (termDays < 15) termDays = 15;
    if (termDays > 90) termDays = 90;

    const quote = FinancialEngine.calculateQuote({
      nominalAmountCents: dto.nominalAmountCents,
      termDays,
      monthlyDiscountRate: dto.monthlyDiscountRate ?? 0.0200,
      prooflyFeeRate: 0.0100
    });

    const operationId = crypto.randomUUID();
    const confirmationToken = crypto.randomUUID();
    const now = new Date();

    const operation = new OperationEntity({
      id: operationId,
      freelancerId: user.id,
      payerNit: dto.payerNit,
      payerLegalName: dto.payerLegalName,
      assetType: AssetType.MILESTONE,
      nominalAmountCents: dto.nominalAmountCents,
      termDays,
      dueDate: dto.dueDate,
      advanceAmountCents: quote.advanceAmountCents,
      commercialDiscountCents: quote.commercialDiscountCents,
      prooflyFeeCents: quote.prooflyFeeCents,
      fundedCapitalCents: 0n,
      status: OperationStatus.PENDING_CLIENT_CONFIRMATION,
      hmacKey,
      confirmationToken,
      payerSolvencyScore: 85,
      freelancerExecutionScore: user.executionScore ?? 88,
      createdAt: now,
      updatedAt: now
    });

    // 4. Despachar enlace de confirmación al pagador sin requerir registro previo
    await this.milestoneNotifier.sendConfirmationLink({
      email: dto.payerEmail,
      token: confirmationToken,
      milestoneTitle: dto.title,
      nominalAmountCents: dto.nominalAmountCents
    });

    // 5. Persistir operación y decrementar cupo
    await this.operationRepo.save(operation);
    await this.userRepo.decrementLimit(user.id, operation.nominalAmountCents);

    // 6. Registrar evento en outbox
    await this.outboxRepo.recordEvent({
      aggregateType: 'OPERATION',
      aggregateId: operation.id,
      eventType: 'MILESTONE_CONFIRMATION_REQUESTED',
      payload: {
        operationId: operation.id,
        payerEmail: dto.payerEmail,
        confirmationToken,
        status: operation.status
      }
    });

    return operation;
  }
}
