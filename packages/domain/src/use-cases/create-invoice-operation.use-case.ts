/**
 * @proofly/domain - Use Case: Crear Operación por Factura Electrónica
 */

import { OperationEntity, AssetType } from '../models/operation.ts';
import { OperationStatus } from '../state/operation-state.ts';
import { AntiDuplicateService } from '../security/anti-duplicate.ts';
import { FinancialEngine } from '../financial/financial-engine.ts';
import type { OperationRepositoryPort } from '../ports/operation-repository.port.ts';
import type { UserRepositoryPort } from '../ports/user-repository.port.ts';
import type { OutboxRepositoryPort } from '../ports/outbox-repository.port.ts';
import type { InvoiceVerificationPort } from '../ports/external-services.port.ts';

export interface CreateInvoiceOperationDto {
  freelancerId: string;
  xmlContent: string;
  monthlyDiscountRate?: number;
}

export class CreateInvoiceOperationUseCase {
  operationRepo: OperationRepositoryPort;
  userRepo: UserRepositoryPort;
  outboxRepo: OutboxRepositoryPort;
  invoiceVerifier: InvoiceVerificationPort;
  antiDuplicateService: AntiDuplicateService;

  constructor(
    operationRepo: OperationRepositoryPort,
    userRepo: UserRepositoryPort,
    outboxRepo: OutboxRepositoryPort,
    invoiceVerifier: InvoiceVerificationPort,
    serverSecret: string
  ) {
    this.operationRepo = operationRepo;
    this.userRepo = userRepo;
    this.outboxRepo = outboxRepo;
    this.invoiceVerifier = invoiceVerifier;
    this.antiDuplicateService = new AntiDuplicateService(serverSecret);
  }

  async execute(dto: CreateInvoiceOperationDto): Promise<OperationEntity> {
    const user = await this.userRepo.findById(dto.freelancerId);
    if (!user) {
      throw new Error(`Freelancer with id ${dto.freelancerId} not found`);
    }

    if (!user.isKycVerified()) {
      throw new Error('Freelancer must be KYC verified to originate operations');
    }

    // 1. Verificar factura electrónica
    const invoiceValidation = await this.invoiceVerifier.verifyInvoice(dto.xmlContent);
    if (!invoiceValidation.isValid) {
      throw new Error(`Invoice validation failed: ${invoiceValidation.rejectionReason ?? 'Unknown reason'}`);
    }

    // 2. Verificar cupo disponible del freelancer (Invariante I13)
    if (user.availableLimitCents !== undefined && user.availableLimitCents < invoiceValidation.nominalAmountCents) {
      throw new Error(
        `Nominal amount (${invoiceValidation.nominalAmountCents} cents) exceeds available limit (${user.availableLimitCents} cents)`
      );
    }

    // 3. Generar HMAC canónico anti-duplicados (Invariante I4)
    const dueDateUnix = Math.floor(new Date(invoiceValidation.dueDate).getTime() / 1000);
    const hmacHex = this.antiDuplicateService.generateInvoiceHmac({
      cufe: 'cufe-simulated-' + invoiceValidation.payerNit.replace(/\D/g, ''),
      issuerNit: user.taxId,
      payerNit: invoiceValidation.payerNit,
      nominalAmountCents: invoiceValidation.nominalAmountCents,
      dueDateUnix
    });
    const hmacKey = '0x' + hmacHex;

    const existing = await this.operationRepo.findByHmac(hmacKey);
    if (existing) {
      throw new Error(`Duplicate invoice detected. Operation with HMAC ${hmacKey} already exists`);
    }

    // 4. Calcular plazo y cotización financiera
    const today = new Date();
    const due = new Date(invoiceValidation.dueDate);
    const diffTime = due.getTime() - today.getTime();
    let termDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (termDays < 15) termDays = 15;
    if (termDays > 90) termDays = 90;

    const quote = FinancialEngine.calculateQuote({
      nominalAmountCents: invoiceValidation.nominalAmountCents,
      termDays,
      monthlyDiscountRate: dto.monthlyDiscountRate ?? 0.0200,
      prooflyFeeRate: 0.0100
    });

    const operationId = crypto.randomUUID();
    const now = new Date();

    const operation = new OperationEntity({
      id: operationId,
      freelancerId: user.id,
      payerNit: invoiceValidation.payerNit,
      payerLegalName: invoiceValidation.payerLegalName,
      assetType: AssetType.INVOICE,
      nominalAmountCents: invoiceValidation.nominalAmountCents,
      termDays,
      dueDate: invoiceValidation.dueDate,
      advanceAmountCents: quote.advanceAmountCents,
      commercialDiscountCents: quote.commercialDiscountCents,
      prooflyFeeCents: quote.prooflyFeeCents,
      fundedCapitalCents: 0n,
      status: OperationStatus.QUOTED,
      hmacKey,
      payerSolvencyScore: 88,
      freelancerExecutionScore: user.executionScore ?? 90,
      createdAt: now,
      updatedAt: now
    });

    // 5. Persistir operación y decrementar cupo
    await this.operationRepo.save(operation);
    await this.userRepo.decrementLimit(user.id, operation.nominalAmountCents);

    // 6. Registrar en outbox
    await this.outboxRepo.recordEvent({
      aggregateType: 'OPERATION',
      aggregateId: operation.id,
      eventType: 'OPERATION_CREATED',
      payload: {
        operationId: operation.id,
        freelancerId: operation.freelancerId,
        assetType: operation.assetType,
        nominalAmountCents: operation.nominalAmountCents.toString(),
        advanceAmountCents: operation.advanceAmountCents.toString(),
        hmacKey: operation.hmacKey,
        status: operation.status
      }
    });

    return operation;
  }
}
