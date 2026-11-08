import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createProoflyServer } from '../server.mjs';
import { RegisterUserUseCase, LoginUseCase } from '../packages/domain/src/index.ts';
import { createAppService } from '../scripts/app-service.mjs';
let server;
let base = process.env.BASE_URL;
if (base) {
  // external target
} else {
  const { createDependencies: make } = await import('../apps/api/src/app.ts');
  const deps = make();
  const register = new RegisterUserUseCase(deps.userRepo, deps.kycVerifier);
  const login = new LoginUseCase(deps.userRepo);
  const app = await createAppService(deps);
  server = createProoflyServer({ appHandler: app.handle.bind(app), auth: { register: dto => register.execute(dto), login: dto => login.execute(dto) } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  await page.waitForURL('**/login');
  // Welcome screen → create a real account (signup) with email + password.
  await page.getByRole('button', { name: 'Crear cuenta en Proofly', exact: true }).click();
  await page.getByLabel('Nombre completo').fill('Andrés Prueba');
  await page.getByLabel('Correo electrónico').fill(`andres-${Date.now()}@proofly.co`);
  await page.getByLabel('Documento (NIT o cédula)').fill('1098765432');
  await page.getByLabel('Contraseña').fill('una-clave-segura');
  await page.locator('form.auth-form').getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.waitForURL('**/app/');
  // A single identity: the same person invests and raises.
  await page.getByRole('heading', { name: 'Tu capital, más flexible', exact: true }).waitFor();
  // Home shows the two twin intent cards.
  await page.getByRole('button', { name: /Invertir/ }).first().waitFor();
  await page.getByRole('button', { name: /Anticipar/ }).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '/private/tmp/proofly-violet-app-mobile.png', fullPage: true });
  const ctaAboveDock = await page.locator('.demo-dual-card').first().evaluate(element => element.getBoundingClientRect().top < document.querySelector('.demo-mobile-dock').getBoundingClientRect().top - 8);
  assert.ok(ctaAboveDock, 'Home cards must sit above the fixed mobile dock.');
  assert.equal(await page.locator('.sidebar').count(), 0, 'The legacy blue UI must not be mounted.');
  // No "demo"/"sandbox" wording anywhere in the visible app.
  const forbidden = await page.evaluate(() => /\b(demo|sandbox|simulad)/i.test(document.body.innerText));
  assert.equal(forbidden, false, 'Visible app must not expose demo/sandbox wording.');
  // The two balances are shown as distinct, labelled cards (never summed).
  await page.getByText('Capital invertido', { exact: true }).waitFor();
  await page.getByText('Cupo para anticipar', { exact: true }).waitFor();
  const nav = () => page.getByRole('navigation', { name: 'Navegación móvil' });
  // Invest in someone else's operation from the market.
  await nav().getByRole('button', { name: 'Mercado', exact: true }).click();
  await page.getByRole('button').filter({ has: page.getByRole('heading', { name: 'Diseño de identidad', exact: true }) }).click();
  // Fund the whole remaining amount so a single participation fully funds the operation.
  const amountInput = page.getByLabel('Monto del aporte en COP');
  await amountInput.waitFor();
  const remainingCents = await amountInput.getAttribute('data-remaining-cents');
  assert.ok(Number(remainingCents) > 0, `remaining funding not readable: ${remainingCents}`);
  await amountInput.fill(String(Math.floor(Number(remainingCents) / 100)));
  await page.getByRole('button', { name: 'Ver retorno estimado', exact: true }).click();
  const confirm = page.getByRole('button', { name: 'Confirmar participación', exact: true });
  await Promise.race([
    confirm.waitFor({ timeout: 8000 }),
    page.locator('.demo-dialog .demo-error').waitFor({ timeout: 8000 }).then(async () => { throw new Error('simulate error: ' + await page.locator('.demo-dialog .demo-error').innerText()); }),
  ]);
  await confirm.click();
  await page.getByRole('button', { name: 'Registrar recaudo total', exact: true }).click();
  await page.getByText('Recaudo distribuido', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await nav().getByRole('button', { name: 'Portafolio', exact: true }).click();
  assert.equal(await page.locator('.demo-position').count(), 1);
  // Create an operation as the same person (raising liquidity).
  await nav().getByRole('button', { name: 'Operaciones', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva operación', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Tipo de operación').selectOption('MILESTONE');
  await page.getByLabel('Título del proyecto').fill('QA-HITO');
  await page.getByLabel('Empresa pagadora').fill('Empresa de pruebas');
  await page.getByLabel('Valor en COP', { exact: true }).fill('1000000');
  await page.getByLabel('Plazo', { exact: true }).selectOption('45');
  await page.getByLabel('El entregable está listo para confirmar').check();
  await page.getByRole('button', { name: 'Crear y cotizar', exact: true }).click();
  await page.getByRole('dialog').getByRole('heading', { name: 'QA-HITO', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Confirmar pago de la empresa', exact: true }).click();
  await page.getByLabel('Acepto la cotización y la cesión de derechos económicos.').check();
  await page.getByRole('button', { name: 'Aceptar cotización', exact: true }).click();
  // You cannot invest in your own operation: no participation panel on an owned op.
  assert.equal(await page.getByLabel('Monto del aporte en COP').count(), 0, 'Owner must not see the participation input.');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva operación', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Tipo de operación').selectOption('INVOICE');
  await page.getByLabel('Título del proyecto').fill('QA-FACTURA');
  await page.getByLabel('Empresa pagadora').fill('Empresa de pruebas');
  for (const name of ['Validación DIAN', 'Acuse de recibo', 'Entrega de bienes o servicios', 'Aceptación del pagador']) await page.getByLabel(name, { exact: true }).check();
  await page.getByRole('button', { name: 'Crear y cotizar', exact: true }).click();
  await page.getByRole('dialog').getByRole('heading', { name: 'QA-FACTURA', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.reload();
  await page.getByRole('heading', { name: 'QA-FACTURA', exact: true }).waitFor();
  for (const width of [320, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['home', 'operations', 'market', 'portfolio', 'history']) {
      await page.goto(`${base}/app/#${route}`);
      await page.locator('.proofly-demo').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route} overflows at ${width}`);
      const clipped = await page.locator('.demo-metric > strong, .demo-operation, .demo-mobile-dock, .demo-welcome').evaluateAll(elements => elements.filter(element => element.getBoundingClientRect().width > 0 && (element.scrollWidth > element.clientWidth + 1 || element.getBoundingClientRect().right > innerWidth + 1)).length);
      assert.equal(clipped, 0, `Clipped app content on ${route} at ${width}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/app/#home`);
  await page.locator('.demo-sidebar').waitFor({ state: 'visible' });
  await page.screenshot({ path: '/private/tmp/proofly-violet-app-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Salir', exact: true }).first().click();
  await page.waitForURL('**/login');
  await page.goto(`${base}/app/`);
  await page.waitForURL('**/login');
  assert.deepEqual(errors, []);
  console.log('PASS: real signup (email + password) → session; unified identity (one person invests and raises); no demo wording; two distinct balance cards; market participation + settlement; owner cannot invest in own operation; invoice + milestone creation/confirmation/acceptance; reload; five responsive routes at 320/390/430/768px; desktop; logout; no JS errors.');
} finally { await browser.close(); if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } }
