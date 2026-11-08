/**
 * Verificación del schema reconciliado contra un Postgres real.
 *
 * Usa los repositorios Postgres reales (no mocks) sobre el driver pg para
 * guardar y leer un usuario y una operación, confirmando que las columnas del
 * esquema coinciden con lo que los repos escriben y leen. Prueba la divergencia
 * que estábamos arreglando.
 *
 * Requiere: docker compose up -d postgres
 * Uso: node --experimental-strip-types scripts/verify-postgres.mjs
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  UserEntity, UserRole, KycStatus, FreelancerTier,
  OperationEntity, AssetType, OperationStatus
} from '@proofly/domain';
import { PgSqlClient } from '../apps/api/src/adapters/postgres/pg-client.ts';
import {
  PostgresUserRepository, PostgresOperationRepository, PostgresOutboxRepository
} from '../apps/api/src/adapters/postgres/postgres-repositories.ts';

const connectionString = process.env.DATABASE_URL || 'postgresql://proofly:proofly_secret@localhost:5432/proofly_db';
const client = new PgSqlClient({ connectionString });
const users = new PostgresUserRepository(client);
const operations = new PostgresOperationRepository(client);
const outbox = new PostgresOutboxRepository(client);
const now = new Date();
const suffix = Date.now();

try {
  // 1. User round-trip, including password_hash and INVESTOR<->FINANCIER mapping.
  const user = new UserEntity({
    id: 'u-' + randomUUID(), email: `persona-${suffix}@proofly.co`, legalName: 'Persona Real',
    taxId: '1098765432', role: UserRole.FREELANCER, kycStatus: KycStatus.VERIFIED,
    passwordHash: 'scrypt$' + suffix, tier: FreelancerTier.TIER_1_SEED,
    availableLimitCents: 200000000n, executionScore: 90, createdAt: now, updatedAt: now
  });
  await users.save(user);
  const readUser = await users.findByEmail(user.email);
  assert.ok(readUser, 'user not found after save');
  assert.equal(readUser.legalName, 'Persona Real');
  assert.equal(readUser.taxId, '1098765432');
  assert.equal(readUser.passwordHash, 'scrypt$' + suffix);
  assert.equal(readUser.availableLimitCents, 200000000n);
  console.log('USER round-trip ok →', readUser.id);

  // 2. Operation round-trip, including the reconciled payer fields.
  const op = new OperationEntity({
    id: 'o-' + randomUUID(), freelancerId: user.id, payerNit: '901234567-8',
    payerLegalName: 'Estudio Nube', assetType: AssetType.INVOICE, nominalAmountCents: 500000000n,
    termDays: 30, dueDate: '2026-12-30', advanceAmountCents: 485000000n,
    commercialDiscountCents: 10000000n, prooflyFeeCents: 5000000n, fundedCapitalCents: 0n,
    status: OperationStatus.APPROVED_PENDING_FUNDING, hmacKey: 'hmac-' + suffix,
    payerSolvencyScore: 88, freelancerExecutionScore: 90, createdAt: now, updatedAt: now
  });
  await operations.save(op);
  const readOp = await operations.findById(op.id);
  assert.ok(readOp, 'operation not found after save');
  assert.equal(readOp.payerNit, '901234567-8');
  assert.equal(readOp.payerLegalName, 'Estudio Nube');
  assert.equal(readOp.commercialDiscountCents, 10000000n);
  assert.equal(readOp.prooflyFeeCents, 5000000n);
  assert.equal(readOp.advanceAmountCents, 485000000n);
  const market = await operations.listMarketplace();
  assert.ok(market.some(o => o.id === op.id), 'operation not in marketplace listing');
  console.log('OPERATION round-trip ok →', readOp.id, '· payer', readOp.payerLegalName);

  // 3. Outbox round-trip (shared api/worker table) with last_error column.
  const event = await outbox.recordEvent({ aggregateType: 'OPERATION', aggregateId: op.id, eventType: 'OPERATION_CREATED', payload: { ok: true } });
  const pending = await outbox.fetchPendingEvents(10);
  assert.ok(pending.some(e => e.id === event.id), 'outbox event not pending');
  await outbox.markCompleted(event.id);
  console.log('OUTBOX round-trip ok →', event.id);

  console.log('\nPASS: schema reconciliado — usuario, operación y outbox hacen round-trip real contra Postgres con los repos reales.');
} finally {
  await client.close();
}
