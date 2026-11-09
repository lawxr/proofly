/**
 * @proofly/api - Repositorios PostgreSQL 16 con Restricciones DDL Estrictas
 * Conforme a db/schema.sql y ADR-0004 (Transactional Outbox con SKIP LOCKED)
 */

import {
  OperationEntity,
  InvestmentEntity,
  UserEntity,
  UserRole,
  KycStatus,
  FreelancerTier,
  OutboxEvent,
  OperationStatus,
  AssetType,
  InvestmentStatus
} from '@proofly/domain';

import type {
  OperationRepositoryPort,
  InvestmentRepositoryPort,
  UserRepositoryPort,
  OutboxRepositoryPort,
  ActivityRepositoryPort,
  ActivityEvent,
  OperationMarketplaceFilter,
  PresentationMetadata,
  OutboxEventProps
} from '@proofly/domain';

export interface SqlQueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface SqlClient {
  query<T = any>(sql: string, params?: any[]): Promise<SqlQueryResult<T>>;
}

export class PostgresOperationRepository implements OperationRepositoryPort {
  private client: SqlClient;

  constructor(client: SqlClient) {
    this.client = client;
  }

  async save(op: OperationEntity): Promise<void> {
    const sql = `
      INSERT INTO operations (
        id, freelancer_id, asset_type, payer_nit, payer_legal_name,
        nominal_amount_cents, advance_amount_cents, commercial_discount_cents,
        platform_fee_cents, funded_capital_cents, term_days, due_date, status,
        canonical_hmac, confirmation_token, electronic_signature_hash,
        payer_solvency_score, freelancer_execution_score, title,
        effective_annual_rate, contract_id, milestone_index, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      )
      ON CONFLICT (id) DO UPDATE SET
        funded_capital_cents = EXCLUDED.funded_capital_cents,
        status = EXCLUDED.status,
        confirmation_token = EXCLUDED.confirmation_token,
        electronic_signature_hash = EXCLUDED.electronic_signature_hash,
        -- Preservar la metadata de presentación: save() se llama sin ella
        -- (la fija setPresentation), así que no la pisamos con NULL en updates.
        title = COALESCE(EXCLUDED.title, operations.title),
        effective_annual_rate = COALESCE(EXCLUDED.effective_annual_rate, operations.effective_annual_rate),
        contract_id = COALESCE(EXCLUDED.contract_id, operations.contract_id),
        milestone_index = COALESCE(EXCLUDED.milestone_index, operations.milestone_index),
        updated_at = EXCLUDED.updated_at
    `;

    await this.client.query(sql, [
      op.id,
      op.freelancerId,
      op.assetType === AssetType.INVOICE ? 'ELECTRONIC_INVOICE' : 'CONTRACT_MILESTONE',
      op.payerNit,
      op.payerLegalName,
      op.nominalAmountCents.toString(),
      op.advanceAmountCents.toString(),
      op.commercialDiscountCents.toString(),
      op.prooflyFeeCents.toString(),
      op.fundedCapitalCents.toString(),
      op.termDays,
      op.dueDate,
      op.status,
      op.hmacKey,
      op.confirmationToken ?? null,
      op.electronicSignatureHash ?? null,
      op.payerSolvencyScore ?? null,
      op.freelancerExecutionScore ?? null,
      op.title ?? null,
      op.effectiveAnnualRate ?? null,
      op.contractId ?? null,
      op.milestoneIndex ?? null,
      op.createdAt,
      op.updatedAt
    ]);
  }

  async findById(id: string): Promise<OperationEntity | null> {
    const res = await this.client.query<any>(`SELECT * FROM operations WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToEntity(res.rows[0]);
  }

  async findByHmac(hmacKey: string): Promise<OperationEntity | null> {
    const res = await this.client.query<any>(`SELECT * FROM operations WHERE canonical_hmac = $1`, [hmacKey]);
    if (res.rows.length === 0) return null;
    return this.mapRowToEntity(res.rows[0]);
  }

  async findByConfirmationToken(token: string): Promise<OperationEntity | null> {
    const res = await this.client.query<any>(`SELECT * FROM operations WHERE confirmation_token = $1`, [token]);
    if (res.rows.length === 0) return null;
    return this.mapRowToEntity(res.rows[0]);
  }

  async listMarketplace(filter?: OperationMarketplaceFilter): Promise<OperationEntity[]> {
    let sql = `SELECT * FROM operations WHERE status = 'APPROVED_PENDING_FUNDING'`;
    const params: any[] = [];

    if (filter?.minTermDays !== undefined) {
      params.push(filter.minTermDays);
      sql += ` AND term_days >= $${params.length}`;
    }
    if (filter?.maxTermDays !== undefined) {
      params.push(filter.maxTermDays);
      sql += ` AND term_days <= $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;
    const res = await this.client.query<any>(sql, params);
    return res.rows.map(r => this.mapRowToEntity(r));
  }

  async listByFreelancer(freelancerId: string): Promise<OperationEntity[]> {
    const res = await this.client.query<any>(
      `SELECT * FROM operations WHERE freelancer_id = $1 ORDER BY created_at DESC`,
      [freelancerId]
    );
    return res.rows.map(r => this.mapRowToEntity(r));
  }

  async updateStatus(id: string, newStatus: OperationStatus): Promise<void> {
    await this.client.query(
      `UPDATE operations SET status = $2, updated_at = NOW() WHERE id = $1`,
      [id, newStatus]
    );
  }

  async setPresentation(id: string, meta: PresentationMetadata): Promise<void> {
    await this.client.query(
      `UPDATE operations SET title = $2, effective_annual_rate = $3, contract_id = $4, milestone_index = $5, updated_at = NOW() WHERE id = $1`,
      [id, meta.title, meta.effectiveAnnualRate, meta.contractId ?? null, meta.milestoneIndex ?? null]
    );
  }

  private mapRowToEntity(row: any): OperationEntity {
    return new OperationEntity({
      id: row.id,
      freelancerId: row.freelancer_id,
      payerNit: row.payer_nit,
      payerLegalName: row.payer_legal_name,
      assetType: row.asset_type === 'ELECTRONIC_INVOICE' ? AssetType.INVOICE : AssetType.MILESTONE,
      nominalAmountCents: BigInt(row.nominal_amount_cents),
      termDays: row.term_days,
      dueDate: typeof row.due_date === 'string' ? row.due_date : row.due_date?.toISOString?.()?.split('T')[0] ?? '',
      advanceAmountCents: BigInt(row.advance_amount_cents),
      commercialDiscountCents: BigInt(row.commercial_discount_cents),
      prooflyFeeCents: BigInt(row.platform_fee_cents),
      fundedCapitalCents: BigInt(row.funded_capital_cents),
      status: row.status as OperationStatus,
      hmacKey: row.canonical_hmac,
      confirmationToken: row.confirmation_token ?? undefined,
      electronicSignatureHash: row.electronic_signature_hash ?? undefined,
      payerSolvencyScore: row.payer_solvency_score ?? undefined,
      freelancerExecutionScore: row.freelancer_execution_score ?? undefined,
      title: row.title ?? undefined,
      // NUMERIC llega como string desde pg; lo normalizamos a número.
      effectiveAnnualRate: row.effective_annual_rate != null ? Number(row.effective_annual_rate) : undefined,
      contractId: row.contract_id ?? undefined,
      milestoneIndex: row.milestone_index ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }
}

export class PostgresInvestmentRepository implements InvestmentRepositoryPort {
  private client: SqlClient;

  constructor(client: SqlClient) {
    this.client = client;
  }

  async save(inv: InvestmentEntity): Promise<void> {
    const sql = `
      INSERT INTO investments (
        id, operation_id, financier_id, funded_capital_cents, tokens_count, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status
    `;
    await this.client.query(sql, [
      inv.id,
      inv.operationId,
      inv.investorId,
      inv.fundedCapitalCents.toString(),
      inv.tokensCount.toString(),
      inv.status,
      inv.createdAt
    ]);
  }

  async findById(id: string): Promise<InvestmentEntity | null> {
    const res = await this.client.query<any>(`SELECT * FROM investments WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByOperationId(operationId: string): Promise<InvestmentEntity[]> {
    const res = await this.client.query<any>(
      `SELECT * FROM investments WHERE operation_id = $1 ORDER BY created_at ASC`,
      [operationId]
    );
    return res.rows.map(r => this.mapRow(r));
  }

  async findByInvestorId(investorId: string): Promise<InvestmentEntity[]> {
    const res = await this.client.query<any>(
      `SELECT * FROM investments WHERE financier_id = $1 ORDER BY created_at DESC`,
      [investorId]
    );
    return res.rows.map(r => this.mapRow(r));
  }

  async sumFundedByOperationId(operationId: string): Promise<bigint> {
    const res = await this.client.query<any>(
      `SELECT COALESCE(SUM(funded_capital_cents), 0) AS total FROM investments WHERE operation_id = $1`,
      [operationId]
    );
    return BigInt(res.rows[0]?.total ?? 0);
  }

  private mapRow(row: any): InvestmentEntity {
    return new InvestmentEntity({
      id: row.id,
      operationId: row.operation_id,
      investorId: row.financier_id,
      fundedCapitalCents: BigInt(row.funded_capital_cents),
      tokensCount: BigInt(row.tokens_count),
      status: row.status as InvestmentStatus,
      createdAt: new Date(row.created_at)
    });
  }
}

export class PostgresUserRepository implements UserRepositoryPort {
  private client: SqlClient;

  constructor(client: SqlClient) {
    this.client = client;
  }

  async save(user: UserEntity): Promise<void> {
    const sql = `
      INSERT INTO users (
        id, email, legal_name, tax_id, role, kyc_status, password_hash, wallet_address,
        tier, available_quota_cents, execution_score, completed_operations_count,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        kyc_status = EXCLUDED.kyc_status,
        password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
        wallet_address = EXCLUDED.wallet_address,
        tier = EXCLUDED.tier,
        available_quota_cents = EXCLUDED.available_quota_cents,
        execution_score = EXCLUDED.execution_score,
        completed_operations_count = EXCLUDED.completed_operations_count,
        updated_at = EXCLUDED.updated_at
    `;

    await this.client.query(sql, [
      user.id,
      user.email,
      user.legalName,
      user.taxId,
      user.role === UserRole.INVESTOR ? 'FINANCIER' : user.role,
      user.kycStatus,
      user.passwordHash ?? null,
      user.walletAddress ?? null,
      user.tier ?? null,
      user.availableLimitCents !== undefined ? user.availableLimitCents.toString() : null,
      user.executionScore ?? null,
      user.completedOperationsCount ?? 0,
      user.createdAt,
      user.updatedAt
    ]);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const res = await this.client.query<any>(`SELECT * FROM users WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const res = await this.client.query<any>(`SELECT * FROM users WHERE email = $1`, [email]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async updateTier(userId: string, tier: FreelancerTier, newLimitCents: bigint): Promise<void> {
    await this.client.query(
      `UPDATE users SET tier = $2, available_quota_cents = $3, updated_at = NOW() WHERE id = $1`,
      [userId, tier, newLimitCents.toString()]
    );
  }

  async decrementLimit(userId: string, amountCents: bigint): Promise<void> {
    await this.client.query(
      `UPDATE users SET available_quota_cents = available_quota_cents - $2, updated_at = NOW() WHERE id = $1`,
      [userId, amountCents.toString()]
    );
  }

  async incrementLimit(userId: string, amountCents: bigint): Promise<void> {
    await this.client.query(
      `UPDATE users SET available_quota_cents = available_quota_cents + $2, updated_at = NOW() WHERE id = $1`,
      [userId, amountCents.toString()]
    );
  }

  private mapRow(row: any): UserEntity {
    return new UserEntity({
      id: row.id,
      email: row.email,
      legalName: row.legal_name,
      taxId: row.tax_id,
      role: row.role === 'FINANCIER' ? UserRole.INVESTOR : (row.role as UserRole),
      kycStatus: row.kyc_status as KycStatus,
      passwordHash: row.password_hash ?? undefined,
      walletAddress: row.wallet_address ?? undefined,
      tier: row.tier as FreelancerTier ?? undefined,
      availableLimitCents: row.available_quota_cents ? BigInt(row.available_quota_cents) : undefined,
      executionScore: row.execution_score ?? undefined,
      completedOperationsCount: row.completed_operations_count ?? 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }
}

export class PostgresOutboxRepository implements OutboxRepositoryPort {
  private client: SqlClient;

  constructor(client: SqlClient) {
    this.client = client;
  }

  async recordEvent(event: Omit<OutboxEventProps, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<OutboxEvent> {
    const id = crypto.randomUUID();
    const now = new Date();

    const sql = `
      INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, created_at)
      VALUES ($1, $2, $3, $4, $5, 'PENDING', 0, $6)
      RETURNING *
    `;

    await this.client.query(sql, [
      id,
      event.aggregateType,
      event.aggregateId,
      event.eventType,
      JSON.stringify(event.payload),
      now
    ]);

    return new OutboxEvent({
      id,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload,
      status: 'PENDING',
      retryCount: 0,
      createdAt: now
    });
  }

  async fetchPendingEvents(batchSize: number): Promise<OutboxEvent[]> {
    // Patrón SKIP LOCKED (ADR-0004) para concurrencia limpia entre workers
    const sql = `
      SELECT * FROM outbox_events
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    `;

    const res = await this.client.query<any>(sql, [batchSize]);
    return res.rows.map(r => new OutboxEvent({
      id: r.id,
      aggregateType: r.aggregate_type,
      aggregateId: r.aggregate_id,
      eventType: r.event_type,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
      status: r.status,
      retryCount: r.retry_count,
      lastError: r.last_error ?? undefined,
      createdAt: new Date(r.created_at),
      processedAt: r.processed_at ? new Date(r.processed_at) : undefined
    }));
  }

  async markCompleted(id: string): Promise<void> {
    await this.client.query(
      `UPDATE outbox_events SET status = 'COMPLETED', processed_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  async markFailed(id: string, reason: string): Promise<void> {
    await this.client.query(
      `UPDATE outbox_events SET status = 'FAILED', last_error = $2, retry_count = retry_count + 1 WHERE id = $1`,
      [id, reason]
    );
  }
}


export class PostgresActivityRepository implements ActivityRepositoryPort {
  private client: SqlClient;

  constructor(client: SqlClient) {
    this.client = client;
  }

  async record(event: Omit<ActivityEvent, 'id' | 'date'> & { id?: string; date?: string }): Promise<ActivityEvent> {
    const id = event.id ?? crypto.randomUUID();
    const date = event.date ?? new Date().toISOString();
    await this.client.query(
      `INSERT INTO activity_events (id, user_id, operation_id, kind, title, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, event.userId, event.operationId, event.kind, event.title, date]
    );
    return { id, userId: event.userId, operationId: event.operationId, kind: event.kind, title: event.title, date };
  }

  async listByUser(userId: string): Promise<ActivityEvent[]> {
    const res = await this.client.query<any>(
      `SELECT * FROM activity_events WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      operationId: r.operation_id,
      kind: r.kind,
      title: r.title,
      date: (r.created_at instanceof Date ? r.created_at.toISOString() : new Date(r.created_at).toISOString())
    }));
  }
}
