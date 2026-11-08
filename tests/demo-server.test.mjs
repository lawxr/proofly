import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDemoServer } from '../server.mjs';

async function fixture(t, options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'proofly-pin-test-'));
  await mkdir(join(root, 'apps/web/dist/assets'), { recursive: true });
  await mkdir(join(root, 'apps/web/dist/private'), { recursive: true });
  await writeFile(join(root, 'apps/web/dist/private/demo.js'), 'console.log("private app")');
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'apps/web/dist/index.html'), '<div id="root">Landing</div>');
  await writeFile(join(root, 'apps/web/dist/assets/public.js'), 'console.log("landing")');
  await writeFile(join(root, 'index.html'), '<div id="app">Private app</div>');
  await writeFile(join(root, 'src/app.js'), 'console.log("private app")');
  await writeFile(join(root, 'secret.html'), 'not public');
  let now = 170000000;
  const server = createDemoServer({ root, pin: '8246', now: () => now, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (path, init) => fetch(origin + path, { redirect: 'manual', ...init });
  const login = (pin = '8246', headers = {}) => request('/api/demo/session', {
    method: 'POST', headers: { 'content-type': 'application/json', origin, ...headers }, body: JSON.stringify({ pin }),
  });
  return { request, login, origin, server, advance: milliseconds => { now += milliseconds; } };
}

test('public landing/login are the default; app and source require a session', async t => {
  const { request } = await fixture(t);
  for (const path of ['/', '/login']) assert.match(await (await request(path)).text(), /Landing/);
  assert.equal((await request('/assets/public.js')).status, 200);
  for (const path of ['/app', '/app/', '/app/index.html', '/src/app.js', '/index.html']) {
    const response = await request(path);
    if (path === '/index.html') assert.match(await response.text(), /Landing/);
    else { assert.equal(response.status, 303, path); assert.equal(response.headers.get('location'), '/login'); }
  }
  for (const path of ['/secret.html', '/apps/web/src/App.tsx', '/.env.demo', '/%2e%2e/secret.html', '/assets/missing.js']) assert.equal((await request(path)).status, 404, path);
});

test('wrong PIN is rejected; correct PIN issues an opaque HttpOnly session, then logout revokes it', async t => {
  const { request, login } = await fixture(t);
  assert.equal((await login('0000')).status, 401);
  const response = await login();
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Path=\//);
  assert.doesNotMatch(cookie, /8246/);
  const session = cookie.split(';')[0];
  for (const path of ['/app/', '/private/demo.js']) assert.equal((await request(path, { headers: { cookie: session } })).status, 200);
  assert.equal((await request('/src/app.js', { headers: { cookie: session } })).status, 404);
  assert.equal((await request('/app/', { headers: { cookie: session + 'tampered' } })).status, 303);
  assert.equal((await request('/api/demo/session', { method: 'DELETE', headers: { cookie: session, origin: new URL('http://localhost').origin } })).status, 403);
  const logout = await request('/api/demo/session', { method: 'DELETE', headers: { cookie: session, 'sec-fetch-site': 'same-origin' } });
  assert.equal(logout.status, 204);
  assert.equal((await request('/app/', { headers: { cookie: session } })).status, 303);
});

test('sessions expire and login throttling cannot be bypassed with forwarding headers', async t => {
  const { request, login, advance } = await fixture(t);
  const session = (await login()).headers.get('set-cookie').split(';')[0];
  advance(8 * 60 * 60 * 1000 + 1);
  assert.equal((await request('/app/', { headers: { cookie: session } })).status, 303);
  for (let i = 0; i < 5; i++) assert.equal((await login('0000', { 'x-forwarded-for': `10.0.0.${i}` })).status, 401);
  const limited = await login();
  assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get('retry-after')) > 0);
  advance(15 * 60 * 1000 + 1);
  assert.equal((await login()).status, 200);
});

test('missing PIN fails closed, cross-origin and malformed requests never create sessions', async t => {
  const { request, login } = await fixture(t);
  assert.equal((await login('8246', { origin: 'https://attacker.example' })).status, 403);
  assert.equal((await request('/api/demo/session', { method: 'POST', headers: { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await request('/api/demo/session', { method: 'POST', headers: { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }, body: 'x'.repeat(2048) })).status, 413);
  const unconfigured = await fixture(t, { pin: '' });
  assert.equal((await unconfigured.login()).status, 503);
  assert.equal((await unconfigured.request('/app/')).status, 303);
});

test('HTTPS configuration uses Secure cookies and private assets are never cacheable', async t => {
  const { request, login } = await fixture(t, { secureCookies: true });
  const response = await login();
  assert.match(response.headers.get('set-cookie'), /; Secure/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const session = response.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/private/demo.js', { headers: { cookie: session } })).headers.get('cache-control'), 'no-store');
});

test('four-digit PINs retain leading zeroes and private APIs never bypass session/origin checks', async t => {
  const { request, login } = await fixture(t, { pin: '0042', appHandler: (_req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"private":true}'); } });
  assert.equal((await login('042')).status, 401);
  assert.equal((await login('00042')).status, 401);
  assert.equal((await request('/api/demo/app')).status, 401);
  const response = await login('0042');
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/demo/app', { headers: { cookie } })).status, 200);
  assert.equal((await request('/api/demo/app/action', { method: 'POST', headers: { cookie, origin: 'https://attacker.example' } })).status, 403);
  const html = await (await request('/app/', { headers: { cookie } })).text();
  assert.match(html, /Landing/);
  assert.doesNotMatch(html, /Private app/);
});


test('concurrent login headers reserve a shared attempt budget before bodies arrive', async t => {
  const { server, origin, login } = await fixture(t, { pin: '0042' });
  const body = JSON.stringify({ pin: '9999' });
  let observed = 0;
  const headersArrived = new Promise(resolve => server.on('request', req => {
    if (req.url === '/api/demo/session' && req.method === 'POST' && ++observed === 12) resolve();
  }));
  const pending = [];
  const clients = [];
  for (let i = 0; i < 12; i++) {
    pending.push(new Promise((resolve, reject) => {
      const req = http.request(origin + '/api/demo/session', { method: 'POST', headers: {
        origin, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body),
      } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
      req.on('error', reject); clients.push(req); req.flushHeaders();
    }));
  }
  await headersArrived;
  for (const client of clients) client.end(body);
  const codes = await Promise.all(pending);
  assert.equal(codes.filter(code => code === 401).length, 5);
  assert.equal(codes.filter(code => code === 429).length, 7);
  assert.equal((await login('0042')).status, 429);
});
