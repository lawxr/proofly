/**
 * @proofly/api - Repositorios en Memoria para Desarrollo y Sandbox
 */

import {
  OperationEntity,
  InvestmentEntity,
  UserEntity,
  OutboxEvent,
  OperationStatus
} from '@proofly/domain';

import type {
  OperationRepositoryPort,
  InvestmentRepositoryPort,
  UserRepositoryPort,
  OutboxRepositoryPort,
  OperationMarketplaceFilter,
  OutboxEventProps,
  FreelancerTier
} from '@proofly/domain';

export class InMemoryOperationRepository implements OperationRepositoryPort {
  private operations: Map<string, OperationEntity> = new Map();

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

  async listMarketplace(filter?: OperationMarketplaceFilter): Promise<OperationEntity[]> {
    let list = Array.from(this.operations.values()).filter(
      op => op.status === OperationStatus.APPROVED_PENDING_FUNDING
    );

    if (filter?.minTermDays !== undefined) {
      list = list.filter(op => op.termDays >= filter.minTermDays!);
    }
    if (filter?.maxTermDays !== undefined) {
      list = list.filter(op => op.termDays <= filter.maxTermDays!);
    }

    return list;
  }

  async updateStatus(id: string, newStatus: OperationStatus): Promise<void> {
    const op = this.operations.get(id);
    if (op) {
      op.status = newStatus;
      op.updatedAt = new Date();
    }
  }
}

export class InMemoryInvestmentRepository implements InvestmentRepositoryPort {
  private investments: Map<string, InvestmentEntity> = new Map();

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

export class InMemoryUserRepository implements UserRepositoryPort {
  private users: Map<string, UserEntity> = new Map();

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

export class InMemoryOutboxRepository implements OutboxRepositoryPort {
  private events: OutboxEvent[] = [];

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
