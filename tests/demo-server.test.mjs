import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProoflyServer } from '../server.mjs';
import { RegisterUserUseCase, LoginUseCase } from '../packages/domain/src/index.ts';

// Minimal in-memory user repo for the auth server tests.
function memUserRepo() {
  const users = new Map();
  return {
    users,
    async save(u) { users.set(u.id, u); },
    async findById(id) { return users.get(id) ?? null; },
    async findByEmail(email) { return [...users.values()].find(u => u.email === email) ?? null; },
    async updateTier() {}, async decrementLimit() {}, async incrementLimit() {},
  };
}

async function fixture(t, options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'proofly-auth-test-'));
  await mkdir(join(root, 'apps/web/dist/assets'), { recursive: true });
  await mkdir(join(root, 'apps/web/dist/private'), { recursive: true });
  await writeFile(join(root, 'apps/web/dist/private/app.js'), 'console.log("private app")');
  await writeFile(join(root, 'apps/web/dist/index.html'), '<div id="root">Landing</div>');
  await writeFile(join(root, 'apps/web/dist/assets/public.js'), 'console.log("landing")');
  await writeFile(join(root, 'secret.html'), 'not public');
  let now = 170000000;
  const repo = options.repo ?? memUserRepo();
  const register = new RegisterUserUseCase(repo);
  const login = new LoginUseCase(repo);
  const auth = options.auth === null ? undefined : { register: dto => register.execute(dto), login: dto => login.execute(dto) };
  const server = createProoflyServer({ root, now: () => now, auth, appHandler: options.appHandler, secureCookies: options.secureCookies });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (path, init) => fetch(origin + path, { redirect: 'manual', ...init });
  const signup = (body = {}, headers = {}) => request('/api/auth/signup', {
    method: 'POST', headers: { 'content-type': 'application/json', origin, ...headers },
    body: JSON.stringify({ email: 'persona@proofly.co', taxId: '1098765432', password: 'una-clave-segura', ...body }),
  });
  const signin = (body = {}, headers = {}) => request('/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json', origin, ...headers },
    body: JSON.stringify({ email: 'persona@proofly.co', password: 'una-clave-segura', ...body }),
  });
  return { request, signup, signin, origin, server, repo, advance: ms => { now += ms; } };
}

test('public landing/login are the default; app requires a session', async t => {
  const { request } = await fixture(t);
  for (const path of ['/', '/login']) assert.match(await (await request(path)).text(), /Landing/);
  assert.equal((await request('/assets/public.js')).status, 200);
  for (const path of ['/app', '/app/', '/app/index.html']) {
    const response = await request(path);
    assert.equal(response.status, 303, path); assert.equal(response.headers.get('location'), '/login');
  }
  for (const path of ['/secret.html', '/.env.local', '/%2e%2e/secret.html', '/assets/missing.js']) assert.equal((await request(path)).status, 404, path);
});

test('signup creates an account and an opaque HttpOnly session; logout revokes it', async t => {
  const { request, signup } = await fixture(t);
  const response = await signup();
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Path=\//);
  assert.doesNotMatch(cookie, /una-clave-segura/);
  const session = cookie.split(';')[0];
  assert.equal((await request('/app/', { headers: { cookie: session } })).status, 200);
  assert.equal((await request('/app/', { headers: { cookie: session + 'tampered' } })).status, 303);
  // Logout requires same-origin.
  assert.equal((await request('/api/auth/session', { method: 'DELETE', headers: { cookie: session, origin: 'http://localhost' } })).status, 403);
  const logout = await request('/api/auth/session', { method: 'DELETE', headers: { cookie: session, 'sec-fetch-site': 'same-origin' } });
  assert.equal(logout.status, 204);
  assert.equal((await request('/app/', { headers: { cookie: session } })).status, 303);
});

test('login verifies credentials; duplicate signup and wrong password are rejected', async t => {
  const { signup, signin } = await fixture(t);
  assert.equal((await signup()).status, 200);
  assert.equal((await signup()).status, 409); // duplicate email
  assert.equal((await signin({ password: 'clave-equivocada' })).status, 401);
  assert.equal((await signin({ email: 'otro@proofly.co' })).status, 401);
  assert.equal((await signin()).status, 200);
});

test('sessions expire and login throttling cannot be bypassed with forwarding headers', async t => {
  const { request, signup, signin, advance } = await fixture(t);
  const session = (await signup()).headers.get('set-cookie').split(';')[0];
  advance(8 * 60 * 60 * 1000 + 1);
  assert.equal((await request('/app/', { headers: { cookie: session } })).status, 303);
  for (let i = 0; i < 8; i++) assert.equal((await signin({ password: 'mala-clave-xx' }, { 'x-forwarded-for': `10.0.0.${i}` })).status, 401);
  const limited = await signin();
  assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get('retry-after')) > 0);
  advance(15 * 60 * 1000 + 1);
  assert.equal((await signin()).status, 200);
});

test('auth unavailable fails closed; cross-origin and malformed requests never create sessions', async t => {
  const { request, signup } = await fixture(t);
  assert.equal((await signup({}, { origin: 'https://attacker.example' })).status, 403);
  assert.equal((await request('/api/auth/signup', { method: 'POST', headers: { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await request('/api/auth/signup', { method: 'POST', headers: { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }, body: 'x'.repeat(4096) })).status, 413);
  const unconfigured = await fixture(t, { auth: null });
  assert.equal((await unconfigured.signup()).status, 503);
  assert.equal((await unconfigured.request('/app/')).status, 303);
});

test('HTTPS configuration uses Secure cookies and private assets are never cacheable', async t => {
  const { request, signup } = await fixture(t, { secureCookies: true });
  const response = await signup();
  assert.match(response.headers.get('set-cookie'), /; Secure/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const session = response.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/private/app.js', { headers: { cookie: session } })).headers.get('cache-control'), 'no-store');
});

test('app API requires a session and enforces origin on mutations', async t => {
  const { request, signup } = await fixture(t, { appHandler: (_req, res, ctx) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ userId: ctx?.userId ?? null })); } });
  assert.equal((await request('/api/app')).status, 401);
  const cookie = (await signup()).headers.get('set-cookie').split(';')[0];
  const ok = await request('/api/app', { headers: { cookie } });
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.ok(typeof body.userId === 'string' && body.userId.length > 0, 'app handler receives the authenticated userId');
  assert.equal((await request('/api/app/action', { method: 'POST', headers: { cookie, origin: 'https://attacker.example' } })).status, 403);
});
