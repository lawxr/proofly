/**
 * Verificación del objetivo del feature: la metadata de operaciones persiste en
 * Postgres y sobrevive a un reinicio del proceso.
 *
 * Simula un reinicio construyendo DOS instancias de app-service con deps
 * Postgres independientes sobre la misma base de datos: la primera crea una
 * operación con título; la segunda (proceso "reiniciado", sin ningún Map en
 * memoria heredado) la lee y debe mostrar título real, tasa E.A., la operación
 * propia en su estado actual y el evento de actividad.
 *
 * Requiere: docker compose up -d postgres
 * Uso: PERSISTENCE=postgres node --experimental-strip-types scripts/verify-metadata-postgres.mjs
 */

import assert from 'node:assert/strict';
import { createPostgresDependencies } from '../apps/api/src/app.ts';
import { RegisterUserUseCase, VerifyIdentityUseCase } from '../packages/domain/src/index.ts';
import { createAppService } from './app-service.mjs';

const connectionString = process.env.DATABASE_URL || 'postgresql://proofly:proofly_secret@localhost:5432/proofly_db';
const suffix = Date.now();

// First process: a fresh user raises an operation with a real title.
const deps1 = createPostgresDependencies(connectionString);
const register = new RegisterUserUseCase(deps1.userRepo, () => 'me-' + suffix);
const me = await register.execute({ email: `meta-${suffix}@proofly.co`, taxId: '1098765432', password: 'una-clave-segura' });
await new VerifyIdentityUseCase(deps1.userRepo, deps1.kycVerifier).execute({ userId: me.id, legalName: 'Persona Real' });

const app1 = await createAppService(deps1);
const created = await app1.execute(me.id, 'create', {
  assetType: 'MILESTONE', title: 'Rediseño de marca', payerLegalName: 'Cliente Corporativo',
  nominalAmountCents: '80000000', termDays: 45, checks: true
});
assert.equal(created.title, 'Rediseño de marca', 'title should be set on creation');
assert.ok(created.effectiveAnnualRate > 0, 'rate should be quoted on creation');
await app1.execute(me.id, 'confirm', { id: created.id });
await app1.execute(me.id, 'accept', { id: created.id, accepted: true });
console.log('PROCESS 1: operación creada →', created.id, '· título', created.title, '· E.A.', created.effectiveAnnualRate);

// Second process: brand-new deps + app-service against the same DB. No in-memory
// metadata carries over. This is the restart the old Map-based code failed.
const deps2 = createPostgresDependencies(connectionString);
const app2 = await createAppService(deps2);
const snapshot = await app2.snapshot(me.id);

const own = snapshot.operations.find(op => op.id === created.id);
assert.ok(own, 'own operation must appear after restart (status is ACTIVE/QUOTED, not funding-open)');
assert.equal(own.title, 'Rediseño de marca', 'title must survive the restart, not fall back to "Operación"');
assert.ok(own.effectiveAnnualRate > 0, 'rate must survive the restart, not fall back to 0');
assert.ok(['QUOTED', 'APPROVED_PENDING_FUNDING'].includes(own.status), `operation is tracked in status ${own.status}`);

const titles = snapshot.events.map(e => e.title);
assert.ok(snapshot.events.length >= 2, 'activity events must survive the restart');
assert.ok(titles.includes('Hito creado · confirmación pendiente'), 'create event persisted');
assert.ok(titles.includes('Cotización aceptada'), 'accept event persisted');
console.log('PROCESS 2 (restart): título', own.title, '· E.A.', own.effectiveAnnualRate, '· estado', own.status, '· eventos', snapshot.events.length);

console.log('\nPASS: la metadata (título, tasa E.A., operación propia y actividad) sobrevive al reinicio con Postgres.');
process.exit(0);
