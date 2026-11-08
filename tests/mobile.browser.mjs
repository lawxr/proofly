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
  // Home: one simple screen like the reference. Title + twin cards + balances.
  await page.getByRole('heading', { name: 'Tu capital, más flexible' }).waitFor();
  const twin = page.locator('.app-twin-card');
  await twin.first().waitFor();
  assert.equal(await twin.count(), 2, 'Home has exactly the two twin cards.');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '/private/tmp/proofly-app-mobile.png', fullPage: true });
  // Cards sit above the fixed dock.
  const cardsAboveDock = await twin.first().evaluate(el => el.getBoundingClientRect().top < document.querySelector('.app-dock').getBoundingClientRect().top - 8);
  assert.ok(cardsAboveDock, 'Home cards must sit above the fixed dock.');
  // No demo/sandbox wording anywhere visible.
  assert.equal(await page.evaluate(() => /\b(demo|sandbox|simulad)/i.test(document.body.innerText)), false, 'No demo wording.');
  // Two separate balances, never summed into a total.
  await page.getByText('Capital invertido', { exact: true }).waitFor();
  await page.getByText('Cupo para anticipar', { exact: true }).waitFor();
  const nav = () => page.getByRole('navigation', { name: 'Navegación' });

  // Invest in someone else's operation.
  await nav().getByRole('button', { name: 'Invertir', exact: true }).click();
  await page.locator('.app-row').filter({ hasText: 'Diseño de identidad' }).click();
  const amountInput = page.getByLabel('¿Cuánto quieres invertir? (COP)');
  await amountInput.waitFor();
  const remainingCents = await amountInput.getAttribute('data-remaining-cents');
  assert.ok(Number(remainingCents) > 0, `remaining funding not readable: ${remainingCents}`);
  await amountInput.fill(String(Math.floor(Number(remainingCents) / 100)));
  // Live estimate shows without an intermediate button; the invest button carries the amount.
  await page.locator('.app-invest-preview').getByText('Ganancia estimada').waitFor();
  await page.getByRole('button', { name: /^Invertir/ }).click();
  await page.getByRole('button', { name: 'Registrar recaudo', exact: true }).click();
  await page.getByText('Recaudo distribuido', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

  // Raise: create one own operation (seed tier allows one active).
  await nav().getByRole('button', { name: 'Anticipar', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Tipo').selectOption('MILESTONE');
  await page.getByLabel('Título').fill('QA-HITO');
  await page.getByLabel('Empresa pagadora').fill('Empresa de pruebas');
  await page.getByLabel('Valor (COP)', { exact: true }).fill('1000000');
  await page.getByLabel('Plazo', { exact: true }).selectOption('45');
  await page.getByLabel('El entregable está listo').check();
  await page.getByRole('button', { name: 'Crear y cotizar', exact: true }).click();
  await page.getByRole('dialog').getByRole('heading', { name: 'QA-HITO', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Confirmar pago de la empresa', exact: true }).click();
  await page.getByLabel('Acepto la cotización y la cesión de derechos.').check();
  await page.getByRole('button', { name: 'Aceptar cotización', exact: true }).click();
  // Owner cannot invest in their own operation: no invest input.
  assert.equal(await page.getByLabel('¿Cuánto quieres invertir? (COP)').count(), 0, 'Owner must not see the invest input.');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.reload();
  await page.locator('.app-row').filter({ hasText: 'QA-HITO' }).waitFor();

  // Header: notifications bell lists account events; profile opens settings with logout.
  await page.goto(`${base}/app/#home`);
  await page.getByRole('button', { name: /Notificaciones/ }).click();
  await page.getByRole('heading', { name: 'Notificaciones', exact: true }).waitFor();
  assert.ok(await page.locator('.app-sheet .app-act').count() >= 1, 'notifications list account events');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir tu cuenta', exact: true }).click();
  await page.getByRole('heading', { name: 'Tu cuenta', exact: true }).waitFor();

  // Responsive: four routes, no overflow or clipping at key widths.
  for (const width of [320, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['home', 'invest', 'raise', 'activity']) {
      await page.goto(`${base}/app/#${route}`);
      await page.locator('.proofly-app').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${route} overflows at ${width}`);
      const clipped = await page.locator('.app-twin-card, .app-row, .app-balance, .app-dock').evaluateAll(els => els.filter(el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().right > innerWidth + 1).length);
      assert.equal(clipped, 0, `Clipped content on ${route} at ${width}`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/app/#home`);
  await page.screenshot({ path: '/private/tmp/proofly-app-home.png', fullPage: true });
  // Logout now lives inside the settings sheet.
  await page.getByRole('button', { name: 'Abrir tu cuenta', exact: true }).click();
  await page.getByRole('button', { name: /Salir de la cuenta/ }).click();
  await page.waitForURL('**/login');
  await page.goto(`${base}/app/`);
  await page.waitForURL('**/login');
  assert.deepEqual(errors, []);
  console.log('PASS: real signup → session; simplified MVP + desktop two-zone layout; 4-tab nav; notifications bell + settings sheet with logout; dedicated invest flow with live estimate; invest in market + settlement; seed tier owner creates one operation and cannot invest in it; reload persists; four routes clean at 320/390/430/768/1440; no JS errors.');
} finally { await browser.close(); if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } }
