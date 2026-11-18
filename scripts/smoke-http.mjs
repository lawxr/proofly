// HTTP smoke test against the running server (npm run dev): signs up a user,
// verifies identity and reads the snapshot exactly as the frontend does.
const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const headers = { 'Content-Type': 'application/json', Origin: base };
const stamp = Date.now();
const signup = await fetch(`${base}/api/auth/signup`, { method: 'POST', headers, body: JSON.stringify({ email: `smoke-${stamp}@proofly.test`, taxId: `3${String(stamp).slice(-9)}`, password: 'smoke-clave-segura' }) });
const cookie = (signup.headers.get('set-cookie') || '').split(';')[0];
console.log('signup', signup.status);
const kyc = await fetch(`${base}/api/account/kyc`, { method: 'POST', headers: { ...headers, Cookie: cookie }, body: JSON.stringify({ legalName: 'Persona Smoke' }) });
console.log('kyc', kyc.status);
const app = await fetch(`${base}/app/`, { headers: { Cookie: cookie }, redirect: 'manual' });
console.log('/app/', app.status, (await app.text()).includes('<div id="root"') ? 'spa-ok' : 'no-root');
const snap = await (await fetch(`${base}/api/app`, { headers: { Cookie: cookie } })).json();
console.log('vault', JSON.stringify({ enabled: snap.vault.enabled, operations: snap.vault.operationsAddress, copPerUsdc: snap.vault.copPerUsdc }));
for (const op of snap.operations) console.log('op', op.id.slice(0, 8), op.status, op.title, '·', op.chain ? `${op.chain.phase} token ${op.chain.tokenId ?? '-'} meta ${op.chain.targetUsdcUnits ?? '-'} blocked ${op.chain.blocked}` : 'sin chain');
const create = await fetch(`${base}/api/app/action`, { method: 'POST', headers: { ...headers, Cookie: cookie }, body: JSON.stringify({ action: 'create', assetType: 'INVOICE', title: 'Smoke factura', payerLegalName: 'Cliente Smoke SAS', nominalAmountCents: '100000000', termDays: 30, checks: true }) });
const created = await create.json();
console.log('create', create.status, created.title, created.payerLegalName, created.status, created.advanceAmountCents);
