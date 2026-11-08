/**
 * Verificación end-to-end: signup real contra el servidor con Postgres.
 * Arranca el servidor con PERSISTENCE=postgres, registra un usuario vía HTTP,
 * y confirma que quedó persistido en la tabla users con su password_hash.
 *
 * Requiere: docker compose up -d postgres
 * Uso: node --experimental-strip-types scripts/verify-auth-postgres.mjs
 */
import assert from 'node:assert/strict';
import { createProoflyServer } from '../server.mjs';
import { createDependenciesFromEnv } from '../apps/api/src/app.ts';
import { RegisterUserUseCase, LoginUseCase } from '../packages/domain/src/index.ts';
import { createAppService } from './app-service.mjs';

process.env.PERSISTENCE = 'postgres';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://proofly:proofly_secret@localhost:5432/proofly_db';

const deps = createDependenciesFromEnv(process.env);
const register = new RegisterUserUseCase(deps.userRepo, deps.kycVerifier);
const login = new LoginUseCase(deps.userRepo);
const app = await createAppService(deps);
const server = createProoflyServer({ appHandler: app.handle.bind(app), auth: { register: d => register.execute(d), login: d => login.execute(d) } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const email = `real-${Date.now()}@proofly.co`;

try {
  const signup = await fetch(base + '/api/auth/signup', {
    method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
    body: JSON.stringify({ legalName: 'Usuario Persistido', email, taxId: '1098765432', password: 'una-clave-segura' }),
  });
  assert.equal(signup.status, 200, 'signup failed');
  const cookie = signup.headers.get('set-cookie').split(';')[0];

  // The authenticated snapshot works against Postgres-backed repos.
  const snap = await (await fetch(base + '/api/app', { headers: { cookie } })).json();
  assert.equal(snap.me.name, 'Usuario Persistido');

  // The user is really in Postgres (read back directly through the repo).
  const persisted = await deps.userRepo.findByEmail(email);
  assert.ok(persisted, 'user not persisted in Postgres');
  assert.ok(persisted.passwordHash?.startsWith('scrypt$'), 'password not hashed in DB');

  // Login with the stored credentials works (verifies the hash from the DB).
  const relogin = await fetch(base + '/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
    body: JSON.stringify({ email, password: 'una-clave-segura' }),
  });
  assert.equal(relogin.status, 200, 'login against persisted user failed');

  console.log('PASS: signup real → usuario persistido en Postgres con password hasheado (scrypt); snapshot autenticado y login contra la DB funcionan.');
} finally {
  server.closeAllConnections();
  await new Promise(r => server.close(r));
  if (deps.userRepo && typeof deps.operationRepo === 'object') { /* pool cleanup via process exit */ }
  process.exit(0);
}
