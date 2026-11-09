import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const SESSION_MS = 8 * 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const COOKIE = 'proofly_session';

/**
 * Proofly server: static assets + real authentication (signup/login) backed by
 * the domain use cases and a persisted user repository, with HttpOnly cookie
 * sessions, same-origin enforcement and per-IP login throttling.
 *
 * `auth` is { register, login } (domain use cases). `appHandler(req, res, ctx)`
 * receives the authenticated { userId } so the app service can scope data.
 */
export function createProoflyServer({ root = process.cwd(), secureCookies = process.env.NODE_ENV === 'production' || process.env.PROOFLY_SECURE_COOKIE === 'true', now = Date.now, appHandler, auth, account } = {}) {
  const sessions = new Map(); // id -> { userId, until }
  const attempts = new Map();
  const dist = resolve(root, 'apps/web/dist');
  const cookieValue = (value, age) => `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secureCookies ? '; Secure' : ''}`;
  const sessionId = req => (req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  const session = req => { const id = sessionId(req); const s = id && sessions.get(id); return s && s.until > now() ? s : null; };
  const prune = () => {
    for (const [id, s] of sessions) if (s.until <= now()) sessions.delete(id);
    for (const [ip, state] of attempts) if (state.until <= now()) attempts.delete(ip);
  };
  const json = (res, status, payload) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(typeof payload === 'string' ? { code: payload } : payload)); };
  const redirect = (res, target) => { res.writeHead(303, { Location: target }); res.end(); };
  const sameOrigin = req => {
    if (req.headers['sec-fetch-site'] === 'cross-site') return false;
    if (!req.headers.origin) return req.headers['sec-fetch-site'] === 'same-origin';
    try { return new URL(req.headers.origin).host === req.headers.host && ['http:', 'https:'].includes(new URL(req.headers.origin).protocol); }
    catch { return false; }
  };
  const readJsonBody = async (req, res, limit = 2048) => {
    if (!req.headers['content-type']?.startsWith('application/json')) { json(res, 415, 'invalid_request'); return undefined; }
    let body = '';
    for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > limit) { json(res, 413, 'invalid_request'); return undefined; } }
    try { return JSON.parse(body); } catch { json(res, 400, 'invalid_request'); return undefined; }
  };
  const startSession = (res, userId) => {
    if (sessions.size >= 10000) return false;
    const id = randomBytes(32).toString('hex');
    sessions.set(id, { userId, until: now() + SESSION_MS });
    res.setHeader('Set-Cookie', cookieValue(id, SESSION_MS / 1000));
    return true;
  };
  const serve = async (res, base, relative) => {
    try {
      const basePath = await realpath(base);
      const path = await realpath(resolve(basePath, relative));
      if (!path.startsWith(basePath + sep) || !TYPES[extname(path)] || !(await stat(path)).isFile()) return json(res, 404, 'not_found');
      const content = await readFile(path);
      res.writeHead(200, { 'Content-Type': TYPES[extname(path)] }); res.end(content);
    } catch { json(res, 404, 'not_found'); }
  };

  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    try {
      prune();
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

      // --- Authentication ---
      if (pathname === '/api/auth/signup' || pathname === '/api/auth/login') {
        if (req.method !== 'POST') return json(res, 405, 'method_not_allowed');
        if (!sameOrigin(req)) return json(res, 403, 'invalid_origin');
        if (!auth) return json(res, 503, 'auth_unavailable');
        const ip = req.socket.remoteAddress;
        if (!attempts.has(ip) && attempts.size >= 10000) return json(res, 503, 'auth_unavailable');
        const state = attempts.get(ip) || { count: 0, until: now() + WINDOW_MS };
        if (state.count >= 8) { res.setHeader('Retry-After', String(Math.ceil((state.until - now()) / 1000))); return json(res, 429, 'try_later'); }
        state.count++; attempts.set(ip, state);
        const data = await readJsonBody(req, res);
        if (data === undefined) return;
        try {
          const user = pathname.endsWith('signup')
            ? await auth.register({ email: data.email, legalName: data.legalName, taxId: data.taxId, password: data.password })
            : await auth.login({ email: data.email, password: data.password });
          sessions.delete(sessionId(req));
          if (!startSession(res, user.id)) return json(res, 503, 'auth_unavailable');
          attempts.delete(ip);
          return json(res, 200, { code: 'authenticated', name: user.legalName });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'auth_failed';
          if (/already exists/i.test(message)) return json(res, 409, 'email_taken');
          if (/Invalid credentials/i.test(message)) return json(res, 401, 'invalid_credentials');
          return json(res, 400, { code: 'invalid_request', message });
        }
      }
      if (pathname === '/api/auth/session' && req.method === 'DELETE') {
        if (!sameOrigin(req)) return json(res, 403, 'invalid_origin');
        sessions.delete(sessionId(req));
        res.setHeader('Set-Cookie', cookieValue('', 0)); res.writeHead(204); return res.end();
      }

      // --- Authenticated account: password change and KYC verification ---
      if (pathname === '/api/account/password' || pathname === '/api/account/kyc') {
        const s = session(req);
        if (!s) return json(res, 401, 'unauthenticated');
        if (!sameOrigin(req)) return json(res, 403, 'invalid_origin');
        if (req.method !== 'POST') return json(res, 405, 'method_not_allowed');
        if (!account) return json(res, 503, 'account_unavailable');
        const data = await readJsonBody(req, res);
        if (data === undefined) return;
        try {
          if (pathname.endsWith('kyc')) {
            const user = await account.verifyIdentity({ userId: s.userId, legalName: data.legalName });
            return json(res, 200, { code: 'verified', name: user.legalName });
          }
          await account.changePassword({ userId: s.userId, currentPassword: data.currentPassword, newPassword: data.newPassword });
          return json(res, 200, { code: 'updated' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'account_failed';
          if (/current password is incorrect/i.test(message)) return json(res, 403, 'wrong_password');
          if (/could not be completed/i.test(message)) return json(res, 422, 'kyc_failed');
          return json(res, 400, { code: 'invalid_request', message });
        }
      }

      // --- Authenticated application API ---
      if (pathname.startsWith('/api/app')) {
        const s = session(req);
        if (!s) return json(res, 401, 'unauthenticated');
        if (!['GET', 'HEAD'].includes(req.method) && !sameOrigin(req)) return json(res, 403, 'invalid_origin');
        if (!appHandler) return json(res, 503, 'app_unavailable');
        return await appHandler(req, res, { userId: s.userId });
      }

      // --- Static + routing ---
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, 'method_not_allowed');
      if (pathname === '/app' || pathname.startsWith('/app/') || pathname.startsWith('/private/')) {
        if (!session(req)) return redirect(res, '/login');
        if (pathname === '/app' || pathname === '/app/' || pathname === '/app/index.html') return serve(res, dist, 'index.html');
        if (pathname.startsWith('/private/')) return serve(res, resolve(dist, 'private'), pathname.slice(9));
        return json(res, 404, 'not_found');
      }
      if (pathname === '/' || pathname === '/index.html' || pathname === '/login' || pathname === '/login/') {
        if (pathname.startsWith('/login') && session(req)) return redirect(res, '/app/');
        return serve(res, dist, 'index.html');
      }
      // Public legal pages: rendered by the SPA, no session required.
      if (pathname === '/privacidad' || pathname === '/privacidad/' || pathname === '/cookies' || pathname === '/cookies/' || pathname === '/aviso' || pathname === '/aviso/') {
        return serve(res, dist, 'index.html');
      }
      if (pathname.startsWith('/assets/')) return serve(res, resolve(dist, 'assets'), pathname.slice(8));
      return json(res, 404, 'not_found');
    } catch {
      if (!res.headersSent) json(res, 404, 'not_found');
      else res.end();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createProoflyServer();
  server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log(`Proofly: http://127.0.0.1:${server.address().port}`));
}
