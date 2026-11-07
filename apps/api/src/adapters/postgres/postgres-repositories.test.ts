/**
 * @proofly/api - Pruebas Unitarias de Repositorios PostgreSQL
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
  OperationStatus,
  AssetType,
  InvestmentStatus
} from '@proofly/domain';

import {
  PostgresOperationRepository,
  PostgresInvestmentRepository,
  PostgresUserRepository,
  PostgresOutboxRepository
} from './postgres-repositories.ts';

import type {
  SqlClient,
  SqlQueryResult
} from './postgres-repositories.ts';

class MockSqlClient implements SqlClient {
  queries: Array<{ sql: string; params?: any[] }> = [];
  mockRows: any[] = [];

  async query<T = any>(sql: string, params?: any[]): Promise<SqlQueryResult<T>> {
    this.queries.push({ sql, params });
    return {
      rows: this.mockRows as T[],
      rowCount: this.mockRows.length
    };
  }
}

describe('Postgres Repositories Unit Tests', () => {
  let client: MockSqlClient;

  beforeEach(() => {
    client = new MockSqlClient();
  });

  it('1. PostgresOperationRepository saves operation with BIGINT cents and queries by id', async () => {
    const repo = new PostgresOperationRepository(client);
    const now = new Date();

    const op = new OperationEntity({
      id: 'op-sql-001',
      freelancerId: 'free-001',
      payerNit: '901234567-8',
      payerLegalName: 'Rappi SAS',
      assetType: AssetType.INVOICE,
      nominalAmountCents: 500000000n, // $ 5.000.000 COP
      termDays: 30,
      dueDate: '2026-12-30',
      advanceAmountCents: 485000000n,
      commercialDiscountCents: 10000000n,
      prooflyFeeCents: 5000000n,
      fundedCapitalCents: 0n,
      status: OperationStatus.QUOTED,
      hmacKey: '0x1234567890abcdef',
      createdAt: now,
      updatedAt: now
    });

    await repo.save(op);
    assert.equal(client.queries.length, 1);
    assert.ok(client.queries[0]?.sql.includes('INSERT INTO operations'));
    assert.equal(client.queries[0]?.params?.[3], '500000000');

    // Simular retorno de SELECT
    client.mockRows = [{
      id: op.id,
      freelancer_id: op.freelancerId,
      payer_nit: op.payerNit,
      payer_legal_name: op.payerLegalName,
      asset_type: 'ELECTRONIC_INVOICE',
      nominal_amount_cents: '500000000',
      term_days: 30,
      due_date: '2026-12-30',
      advance_amount_cents: '485000000',
      commercial_discount_cents: '10000000',
      platform_fee_cents: '5000000',
      funded_capital_cents: '0',
      status: OperationStatus.QUOTED,
      canonical_hmac: op.hmacKey,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    }];

    const found = await repo.findById(op.id);
    assert.ok(found);
    assert.equal(found?.nominalAmountCents, 500000000n);
    assert.equal(found?.status, OperationStatus.QUOTED);
  });

  it('2. PostgresOutboxRepository uses SKIP LOCKED for concurrent worker safety (ADR-0004)', async () => {
    const repo = new PostgresOutboxRepository(client);

    await repo.recordEvent({
      aggregateType: 'OPERATION',
      aggregateId: 'op-001',
      eventType: 'OPERATION_CREATED',
      payload: { test: true }
    });

    assert.equal(client.queries.length, 1);
    assert.ok(client.queries[0]?.sql.includes('INSERT INTO outbox_events'));

    // Fetch pending
    client.mockRows = [{
      id: 'evt-001',
      aggregate_type: 'OPERATION',
      aggregate_id: 'op-001',
      event_type: 'OPERATION_CREATED',
      payload: { test: true },
      status: 'PENDING',
      retry_count: 0,
      created_at: new Date().toISOString()
    }];

    const pending = await repo.fetchPendingEvents(10);
    assert.equal(pending.length, 1);
    const fetchQuery = client.queries[1]?.sql;
    assert.ok(fetchQuery?.includes('FOR UPDATE SKIP LOCKED'));
  });
});
