import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const SESSION_MS = 8 * 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const COOKIE = 'proofly_demo';
const digest = value => createHash('sha256').update(value).digest();

export function createDemoServer({ root = process.cwd(), pin = process.env.DEMO_ACCESS_PIN || '', secureCookies = process.env.NODE_ENV === 'production' || process.env.DEMO_SECURE_COOKIE === 'true', now = Date.now, appHandler } = {}) {
  if (pin && !/^\d{4}$/.test(pin)) throw new Error('DEMO_ACCESS_PIN must contain exactly 4 digits.');
  const pinDigest = digest(pin);
  const sessions = new Map();
  const attempts = new Map();
  const dist = resolve(root, 'apps/web/dist');
  const cookieValue = (value, age) => `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secureCookies ? '; Secure' : ''}`;
  const sessionId = req => (req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  const authorized = req => {
    const id = sessionId(req);
    return Boolean(id && (sessions.get(id) || 0) > now());
  };
  const prune = () => {
    for (const [id, until] of sessions) if (until <= now()) sessions.delete(id);
    for (const [ip, state] of attempts) if (state.until <= now()) attempts.delete(ip);
  };
  const json = (res, status, code) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ code })); };
  const redirect = (res, target) => { res.writeHead(303, { Location: target }); res.end(); };
  const sameOrigin = req => {
    if (req.headers['sec-fetch-site'] === 'cross-site') return false;
    if (!req.headers.origin) return req.headers['sec-fetch-site'] === 'same-origin';
    try { return new URL(req.headers.origin).host === req.headers.host && ['http:', 'https:'].includes(new URL(req.headers.origin).protocol); }
    catch { return false; }
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
      if (pathname === '/api/demo/session') {
        if (!['POST', 'DELETE'].includes(req.method)) return json(res, 405, 'method_not_allowed');
        if (!sameOrigin(req)) return json(res, 403, 'invalid_origin');
        if (req.method === 'DELETE') {
          sessions.delete(sessionId(req));
          res.setHeader('Set-Cookie', cookieValue('', 0)); res.writeHead(204); return res.end();
        }
        if (!pin) return json(res, 503, 'demo_unavailable');
        const ip = req.socket.remoteAddress;
        if (!attempts.has(ip) && attempts.size >= 10000) return json(res, 503, 'demo_unavailable');
        const state = attempts.get(ip) || { count: 0, until: now() + WINDOW_MS };
        if (state.count >= 5) {
          res.setHeader('Retry-After', String(Math.ceil((state.until - now()) / 1000)));
          return json(res, 429, 'try_later');
        }
        if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, 'invalid_request');
        // Reserve synchronously: concurrent slow bodies must share the same attempt budget.
        state.count++;
        attempts.set(ip, state);
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 1024) return json(res, 413, 'invalid_request');
        }
        let candidate;
        try { candidate = JSON.parse(body)?.pin; } catch { return json(res, 400, 'invalid_request'); }
        const valid = typeof candidate === 'string' && /^\d{4}$/.test(candidate) && timingSafeEqual(digest(candidate), pinDigest);
        if (!valid) return json(res, 401, 'invalid_pin');
        if (sessions.size >= 1000) return json(res, 503, 'demo_unavailable');
        sessions.delete(sessionId(req));
        const id = randomBytes(32).toString('hex');
        sessions.set(id, now() + SESSION_MS);
        attempts.delete(ip);
        res.setHeader('Set-Cookie', cookieValue(id, SESSION_MS / 1000));
        return json(res, 200, 'authenticated');
      }
      if (pathname.startsWith('/api/demo/app')) {
        if (!authorized(req)) return json(res, 401, 'unauthenticated');
        if (!['GET', 'HEAD'].includes(req.method) && !sameOrigin(req)) return json(res, 403, 'invalid_origin');
        if (!appHandler) return json(res, 503, 'demo_unavailable');
        return await appHandler(req, res);
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, 'method_not_allowed');
      if (pathname === '/app' || pathname.startsWith('/app/') || pathname.startsWith('/src/') || pathname.startsWith('/private/')) {
        if (!authorized(req)) return redirect(res, '/login');
        if (pathname === '/app' || pathname === '/app/' || pathname === '/app/index.html') return serve(res, dist, 'index.html');
        if (pathname.startsWith('/private/')) return serve(res, resolve(dist, 'private'), pathname.slice(9));
        return json(res, 404, 'not_found');
      }
      if (pathname === '/' || pathname === '/index.html' || pathname === '/login' || pathname === '/login/') {
        if (pathname.startsWith('/login') && authorized(req)) return redirect(res, '/app/');
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
  const server = createDemoServer();
  if (!process.env.DEMO_ACCESS_PIN) console.warn('Private demo is locked: configure DEMO_ACCESS_PIN.');
  server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log(`Proofly: http://127.0.0.1:${server.address().port}`));
}
