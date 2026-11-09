/**
 * @proofly/domain - Pruebas Unitarias de Casos de Uso
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  OperationEntity,
  InvestmentEntity,
  UserEntity,
  UserRole,
  KycStatus,
  FreelancerTier,
  OutboxEvent,
  OperationStatus,
  SimulateQuoteUseCase,
  CreateInvoiceOperationUseCase,
  CreateMilestoneOperationUseCase,
  ConfirmMilestoneUseCase,
  AcceptQuoteUseCase,
  SimulateParticipationUseCase,
  PurchaseParticipationUseCase,
  ReconcileBankReceiptUseCase
} from '../index.ts';

import type {
  OutboxEventProps,
  OperationRepositoryPort,
  InvestmentRepositoryPort,
  UserRepositoryPort,
  OutboxRepositoryPort,
  InvoiceVerificationPort,
  MilestoneConfirmationPort
} from '../index.ts';

// --- Repositorios y Adaptadores Mock en Memoria ---

class InMemoryOperationRepository implements OperationRepositoryPort {
  operations: Map<string, OperationEntity> = new Map();

  async save(operation: OperationEntity): Promise<void> {
    this.operations.set(operation.id, operation);
  }

  async findById(id: string): Promise<OperationEntity | null> {
    return this.operations.get(id) ?? null;
  }

  async findByHmac(hmacKey: string): Promise<OperationEntity | null> {
    for (const op of this.operations.values()) {
      if (op.hmacKey === hmacKey) return op;
    }
    return null;
  }

  async findByConfirmationToken(token: string): Promise<OperationEntity | null> {
    for (const op of this.operations.values()) {
      if (op.confirmationToken === token) return op;
    }
    return null;
  }

  async listMarketplace(): Promise<OperationEntity[]> {
    return Array.from(this.operations.values()).filter(
      op => op.status === OperationStatus.APPROVED_PENDING_FUNDING
    );
  }

  async listByFreelancer(freelancerId: string): Promise<OperationEntity[]> {
    return Array.from(this.operations.values()).filter(op => op.freelancerId === freelancerId);
  }

  async updateStatus(id: string, newStatus: OperationStatus): Promise<void> {
    const op = this.operations.get(id);
    if (op) {
      op.status = newStatus;
      op.updatedAt = new Date();
    }
  }

  async setPresentation(id: string, meta: { title: string; effectiveAnnualRate: number; contractId?: string; milestoneIndex?: number }): Promise<void> {
    const op = this.operations.get(id);
    if (op) {
      op.title = meta.title;
      op.effectiveAnnualRate = meta.effectiveAnnualRate;
      op.contractId = meta.contractId;
      op.milestoneIndex = meta.milestoneIndex;
    }
  }
}

class InMemoryInvestmentRepository implements InvestmentRepositoryPort {
  investments: Map<string, InvestmentEntity> = new Map();

  async save(investment: InvestmentEntity): Promise<void> {
    this.investments.set(investment.id, investment);
  }

  async findById(id: string): Promise<InvestmentEntity | null> {
    return this.investments.get(id) ?? null;
  }

  async findByOperationId(operationId: string): Promise<InvestmentEntity[]> {
    return Array.from(this.investments.values()).filter(i => i.operationId === operationId);
  }

  async findByInvestorId(investorId: string): Promise<InvestmentEntity[]> {
    return Array.from(this.investments.values()).filter(i => i.investorId === investorId);
  }

  async sumFundedByOperationId(operationId: string): Promise<bigint> {
    const list = await this.findByOperationId(operationId);
    return list.reduce((acc, i) => acc + i.fundedCapitalCents, 0n);
  }
}

class InMemoryUserRepository implements UserRepositoryPort {
  users: Map<string, UserEntity> = new Map();

  async save(user: UserEntity): Promise<void> {
    this.users.set(user.id, user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    for (const u of this.users.values()) {
      if (u.email === email) return u;
    }
    return null;
  }

  async updateTier(userId: string, tier: FreelancerTier, newLimitCents: bigint): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.tier = tier;
      u.availableLimitCents = newLimitCents;
    }
  }

  async decrementLimit(userId: string, amountCents: bigint): Promise<void> {
    const u = this.users.get(userId);
    if (u && u.availableLimitCents !== undefined) {
      u.availableLimitCents -= amountCents;
    }
  }

  async incrementLimit(userId: string, amountCents: bigint): Promise<void> {
    const u = this.users.get(userId);
    if (u && u.availableLimitCents !== undefined) {
      u.availableLimitCents += amountCents;
    }
  }
}

class InMemoryOutboxRepository implements OutboxRepositoryPort {
  events: OutboxEvent[] = [];

  async recordEvent(event: Omit<OutboxEventProps, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<OutboxEvent> {
    const outbox = new OutboxEvent({
      id: crypto.randomUUID(),
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload,
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date()
    });
    this.events.push(outbox);
    return outbox;
  }

  async fetchPendingEvents(batchSize: number): Promise<OutboxEvent[]> {
    return this.events.filter(e => e.status === 'PENDING').slice(0, batchSize);
  }

  async markCompleted(id: string): Promise<void> {
    const e = this.events.find(ev => ev.id === id);
    if (e) {
      e.status = 'COMPLETED';
      e.processedAt = new Date();
    }
  }

  async markFailed(id: string, reason: string): Promise<void> {
    const e = this.events.find(ev => ev.id === id);
    if (e) {
      e.status = 'FAILED';
      e.lastError = reason;
    }
  }
}

class MockInvoiceVerificationAdapter implements InvoiceVerificationPort {
  async verifyInvoice(xmlContent: string) {
    if (!xmlContent.includes('cac:InvoiceLine')) {
      return {
        isValid: false,
        events: [],
        rejectionReason: 'Invalid XML or missing invoice lines',
        payerNit: '',
        payerLegalName: '',
        nominalAmountCents: 0n,
        dueDate: ''
      };
    }
    return {
      isValid: true,
      events: ['030_RECEPCION', '032_BIENES_SERVICIOS', '033_ACEPTACION_TACITA'],
      payerNit: '900123456-1',
      payerLegalName: 'Bancolombia S.A.',
      nominalAmountCents: 300000000n, // $ 3.000.000 COP
      dueDate: '2026-12-15'
    };
  }
}

class MockMilestoneConfirmationAdapter implements MilestoneConfirmationPort {
  dispatchedEmails: Array<{ email: string; token: string }> = [];

  async sendConfirmationLink(params: {
    email: string;
    token: string;
    milestoneTitle: string;
    nominalAmountCents: bigint;
  }): Promise<boolean> {
    this.dispatchedEmails.push({ email: params.email, token: params.token });
    return true;
  }
}

// --- Suite de Pruebas ---

describe('Proofly Core Application Use Cases', () => {
  let operationRepo: InMemoryOperationRepository;
  let investmentRepo: InMemoryInvestmentRepository;
  let userRepo: InMemoryUserRepository;
  let outboxRepo: InMemoryOutboxRepository;
  let invoiceVerifier: MockInvoiceVerificationAdapter;
  let milestoneNotifier: MockMilestoneConfirmationAdapter;

  const secretSalt = 'proofly-test-salt-xyz-2026-super-secure-secret-32-chars';

  let freelancer: UserEntity;
  let investor1: UserEntity;
  let investor2: UserEntity;

  beforeEach(async () => {
    operationRepo = new InMemoryOperationRepository();
    investmentRepo = new InMemoryInvestmentRepository();
    userRepo = new InMemoryUserRepository();
    outboxRepo = new InMemoryOutboxRepository();
    invoiceVerifier = new MockInvoiceVerificationAdapter();
    milestoneNotifier = new MockMilestoneConfirmationAdapter();

    freelancer = new UserEntity({
      id: 'free-001',
      email: 'freelancer@proofly.co',
      legalName: 'Carlos Dev',
      taxId: '1020304050',
      role: UserRole.FREELANCER,
      kycStatus: KycStatus.VERIFIED,
      tier: FreelancerTier.TIER_1_SEED,
      availableLimitCents: 300000000n, // $ 3.000.000 COP
      executionScore: 92,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    investor1 = new UserEntity({
      id: 'inv-001',
      email: 'investor1@proofly.co',
      legalName: 'Ana Financiadora',
      taxId: '5060708090',
      role: UserRole.INVESTOR,
      kycStatus: KycStatus.VERIFIED,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    investor2 = new UserEntity({
      id: 'inv-002',
      email: 'investor2@proofly.co',
      legalName: 'Luis Capital',
      taxId: '6070809010',
      role: UserRole.INVESTOR,
      kycStatus: KycStatus.VERIFIED,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await userRepo.save(freelancer);
    await userRepo.save(investor1);
    await userRepo.save(investor2);
  });

  it('1. SimulateQuoteUseCase: computes financial quote accurately', () => {
    const useCase = new SimulateQuoteUseCase();
    const quote = useCase.execute({
      nominalAmountCents: 100000000n, // $ 1.000.000 COP
      termDays: 30
    });

    assert.equal(quote.nominalAmountCents, 100000000n);
    assert.equal(quote.commercialDiscountCents, 2000000n); // 2.0% = $ 20.000 COP
    assert.equal(quote.prooflyFeeCents, 1000000n); // 1.0% = $ 10.000 COP
    assert.equal(quote.advanceAmountCents, 97000000n); // $ 970.000 COP
    assert.equal(quote.advanceAmountCents + quote.commercialDiscountCents + quote.prooflyFeeCents, quote.nominalAmountCents);
  });

  it('2. CreateInvoiceOperationUseCase: creates operation, reserves limit, and records outbox event', async () => {
    const useCase = new CreateInvoiceOperationUseCase(
      operationRepo,
      userRepo,
      outboxRepo,
      invoiceVerifier,
      secretSalt
    );

    const validXml = '<Invoice><cac:InvoiceLine>Design</cac:InvoiceLine></Invoice>';
    const op = await useCase.execute({
      freelancerId: freelancer.id,
      xmlContent: validXml
    });

    assert.ok(op.id);
    assert.equal(op.status, OperationStatus.QUOTED);
    assert.equal(op.nominalAmountCents, 300000000n);

    // Invariante I4: HMAC canónico generado
    assert.ok(op.hmacKey.startsWith('0x'));

    // Verifica límite decrementado en el usuario
    const updatedUser = await userRepo.findById(freelancer.id);
    assert.equal(updatedUser?.availableLimitCents, 0n);

    // Verifica evento outbox
    const events = await outboxRepo.fetchPendingEvents(10);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.eventType, 'OPERATION_CREATED');

    // Restaurar cupo temporalmente para probar que el chequeo de duplicados frena la operación
    await userRepo.incrementLimit(freelancer.id, 300000000n);
    await assert.rejects(
      () => useCase.execute({ freelancerId: freelancer.id, xmlContent: validXml }),
      /Duplicate invoice detected/
    );
  });

  it('3. Complete Lifecycle: Milestone -> Confirm -> Accept -> Fund (50/50) -> Settle Waterfall', async () => {
    // A. Create Milestone Operation
    const createMilestoneUseCase = new CreateMilestoneOperationUseCase(
      operationRepo,
      userRepo,
      outboxRepo,
      milestoneNotifier,
      secretSalt
    );

    const milestoneOp = await createMilestoneUseCase.execute({
      freelancerId: freelancer.id,
      contractUuid: 'c0a80101-0000-0000-0000-000000000001',
      milestoneIndex: 1,
      title: 'Hito 1: Entrega Wireframes',
      deliverableUrl: 'https://figma.com/file/123',
      payerNit: '900999888-1',
      payerLegalName: 'Globant Colombia',
      payerEmail: 'client@globant.com',
      nominalAmountCents: 200000000n, // $ 2.000.000 COP
      termDays: 30,
      dueDate: '2026-12-30'
    });

    assert.equal(milestoneOp.status, OperationStatus.PENDING_CLIENT_CONFIRMATION);
    assert.ok(milestoneOp.confirmationToken);
    assert.equal(milestoneNotifier.dispatchedEmails.length, 1);

    // B. Payer Confirms Milestone
    const confirmUseCase = new ConfirmMilestoneUseCase(operationRepo, outboxRepo);
    const confirmedOp = await confirmUseCase.execute({
      token: milestoneOp.confirmationToken!
    });
    assert.equal(confirmedOp.status, OperationStatus.QUOTED);

    // C. Freelancer Accepts Quote and Signs Cession
    const acceptQuoteUseCase = new AcceptQuoteUseCase(operationRepo, outboxRepo);
    const listedOp = await acceptQuoteUseCase.execute({
      operationId: confirmedOp.id,
      freelancerId: freelancer.id,
      electronicSignatureHash: '0xabcdef1234567890abcdef1234567890'
    });
    assert.equal(listedOp.status, OperationStatus.APPROVED_PENDING_FUNDING);

    // D. Marketplace Simulation
    const simulatePartUseCase = new SimulateParticipationUseCase(operationRepo);
    const halfAmount = listedOp.advanceAmountCents / 2n;
    const simResult = await simulatePartUseCase.execute({
      operationId: listedOp.id,
      amountToFundCents: halfAmount
    });
    assert.equal(simResult.fundedCapitalCents, halfAmount);
    assert.ok(simResult.netEstimatedProfitCents > 0n);

    // E. Investor 1 Purchases 50%
    const purchaseUseCase = new PurchaseParticipationUseCase(
      operationRepo,
      investmentRepo,
      userRepo,
      outboxRepo
    );

    const part1 = await purchaseUseCase.execute({
      operationId: listedOp.id,
      investorId: investor1.id,
      fundedCapitalCents: halfAmount
    });
    assert.equal(part1.isFullyFunded, false);
    assert.equal(part1.operation.status, OperationStatus.APPROVED_PENDING_FUNDING);

    // F. Investor 2 Purchases Remaining 50%
    const part2 = await purchaseUseCase.execute({
      operationId: listedOp.id,
      investorId: investor2.id,
      fundedCapitalCents: listedOp.advanceAmountCents - halfAmount
    });
    assert.equal(part2.isFullyFunded, true);
    assert.equal(part2.operation.status, OperationStatus.ACTIVE_FUNDED);

    // G. Bank Payment Settlement (Cascada Waterfall)
    const settleUseCase = new ReconcileBankReceiptUseCase(operationRepo, investmentRepo, outboxRepo);
    const settleResult = await settleUseCase.execute({
      operationId: listedOp.id,
      bankReceiptHash: '0xhashbancario123456',
      receivedAmountCents: listedOp.nominalAmountCents, // $ 2.000.000 COP
      bankTransactionRef: 'ACH-2026-99988'
    });

    assert.equal(settleResult.isFullySettled, true);
    assert.equal(settleResult.newStatus, OperationStatus.SETTLED);
    assert.equal(settleResult.prooflyFeeRetainedCents, listedOp.prooflyFeeCents);

    // Suma de distribuciones a financiadores + fee de Proofly == nominalAmountCents (0 centavos perdidos)
    const totalToInvestors = settleResult.investorDistributions.reduce(
      (acc, d) => acc + d.totalDistributedCents,
      0n
    );
    assert.equal(
      totalToInvestors + settleResult.prooflyFeeRetainedCents,
      listedOp.nominalAmountCents
    );
  });
});
