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
  const { ChangePasswordUseCase, VerifyIdentityUseCase } = await import('../packages/domain/src/index.ts');
  const deps = make();
  const register = new RegisterUserUseCase(deps.userRepo);
  const login = new LoginUseCase(deps.userRepo);
  const app = await createAppService(deps);
  server = createProoflyServer({ appHandler: app.handle.bind(app),
    auth: { register: dto => register.execute(dto), login: dto => login.execute(dto) },
    account: { changePassword: dto => new ChangePasswordUseCase(deps.userRepo).execute(dto), verifyIdentity: dto => new VerifyIdentityUseCase(deps.userRepo, deps.kycVerifier).execute(dto) } });
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
  // Welcome screen → create a real account. No name field: it comes from KYC later.
  await page.getByRole('button', { name: 'Crear cuenta en Proofly', exact: true }).click();
  assert.equal(await page.getByLabel('Nombre completo').count(), 0, 'signup must not ask for a name');
  await page.getByLabel('Correo electrónico').fill(`andres.prueba-${Date.now()}@proofly.co`);
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
  // Balance hero shows both sides separately (never a single summed total).
  await page.locator('.app-hero-balance').getByText('Capital invertido', { exact: true }).waitFor();
  await page.locator('.app-hero-balance').getByText('Cupo para anticipar', { exact: true }).waitFor();
  assert.ok(await page.locator('.app-hero-spark i').count() >= 5, 'balance hero shows a spark trend');
  // A fresh account shows a designed empty state with actions, not bare text.
  await page.locator('.app-empty .app-empty-actions').waitFor();
  const nav = () => page.getByRole('navigation', { name: 'Navegación' });

  // KYC is required before operating: a fresh account verifies identity first.
  await page.getByRole('button', { name: 'Abrir tu cuenta', exact: true }).click();
  await page.waitForFunction(() => location.hash === '#settings');
  await page.locator('.app-kyc-badge.is-pending').waitFor();
  await page.getByLabel('Nombre legal completo').fill('Andrés Prueba Gómez');
  await page.getByRole('button', { name: 'Verificar identidad', exact: true }).click();
  await page.getByText('Identidad verificada.', { exact: true }).waitFor();
  await page.locator('.app-screen-head .app-back').click();
  await page.locator('.app-title').waitFor();

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
  await page.locator('.app-sheet').getByRole('button', { name: /^Invertir/ }).click();
  await page.getByRole('button', { name: 'Registrar recaudo', exact: true }).click();
  await page.getByText('Recaudo distribuido', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

  // Raise: create one own invoice operation (seed tier allows one active).
  await nav().getByRole('button', { name: 'Anticipar', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva', exact: true }).click();
  // Asset type is a tab, not a select. Default is Factura (invoice).
  await page.locator('.app-asset-tabs').getByRole('tab', { name: 'Factura' }).click();
  await page.getByLabel('Título').fill('QA-FACTURA');
  await page.getByLabel('Empresa pagadora').fill('Empresa de pruebas');
  await page.locator('.app-sheet input[name="amount"]').fill('1000000');
  await page.locator('.app-sheet select[name="term"]').selectOption('45');
  // Live quote: "Recibes hoy".
  await page.locator('.app-quote-advance').getByText('Recibes hoy').waitFor();
  // The submit is disabled until every event is confirmed.
  assert.equal(await page.getByRole('button', { name: /Solicitar anticipo/ }).isDisabled(), true, 'submit disabled until all events confirmed');
  // Confirm the first event; it reveals the conditional attachment UI.
  await page.locator('.app-event').filter({ hasText: 'Validación DIAN' }).click();
  await page.locator('.app-attach-drop').waitFor();
  // Confirm the remaining events.
  for (const label of ['Acuse de recibo', 'Entrega realizada', 'Aceptación del pagador']) {
    await page.locator('.app-event').filter({ hasText: label }).click();
  }
  await page.getByRole('button', { name: /Solicitar anticipo/ }).click();
  await page.getByRole('dialog').getByRole('heading', { name: 'QA-FACTURA', exact: true }).waitFor();
  // An invoice goes straight to QUOTED; owner cannot invest in their own operation.
  assert.equal(await page.getByLabel('¿Cuánto quieres invertir? (COP)').count(), 0, 'Owner must not see the invest input.');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.reload();
  await page.locator('.app-row').filter({ hasText: 'QA-FACTURA' }).waitFor();

  // Notifications: a dropdown anchored to the bell, opening downward.
  await page.goto(`${base}/app/#home`);
  await page.getByRole('button', { name: /Notificaciones/ }).click();
  await page.locator('.app-notif-menu').waitFor();
  assert.ok(await page.locator('.app-notif-item').count() >= 1, 'notifications list account events');
  // The menu opens below the bell (standard dropdown).
  const belowBell = await page.evaluate(() => {
    const bell = document.querySelector('.app-bell').getBoundingClientRect();
    const menu = document.querySelector('.app-notif-menu').getBoundingClientRect();
    return menu.top >= bell.bottom - 2;
  });
  assert.ok(belowBell, 'notifications dropdown opens downward from the bell');
  // Dismiss with Escape (outside-click also closes it), then confirm it closed.
  await page.keyboard.press('Escape');
  await page.locator('.app-notif-menu').waitFor({ state: 'hidden' });

  // Settings: its own full-screen page, reached from the profile.
  await page.getByRole('button', { name: 'Abrir tu cuenta', exact: true }).click();
  await page.waitForFunction(() => location.hash === '#settings');
  await page.getByRole('heading', { name: 'Ajustes', exact: true }).waitFor();
  // The name is not editable; after KYC it shows as verified (comes from verification).
  assert.equal(await page.getByLabel('Nombre completo').count(), 0, 'name must not be editable in settings');
  await page.locator('.app-kyc-badge.is-verified').waitFor();
  // Back to home.
  await page.locator('.app-screen-head .app-back').click();
  await page.locator('.app-title').waitFor();

  // Responsive: routes, no overflow or clipping at key widths.
  for (const width of [320, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['home', 'invest', 'raise', 'activity', 'settings']) {
      await page.goto(`${base}/app/#${route}`);
      await page.locator('.proofly-app').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${route} overflows at ${width}`);
      const clipped = await page.locator('.app-twin-card, .app-row, .app-balance, .app-dock').evaluateAll(els => els.filter(el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().right > innerWidth + 1).length);
      assert.equal(clipped, 0, `Clipped content on ${route} at ${width}`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/app/#settings`);
  await page.screenshot({ path: '/private/tmp/proofly-app-settings.png', fullPage: true });
  // Logout lives on the settings screen.
  await page.getByRole('button', { name: /Salir de la cuenta/ }).click();
  await page.waitForURL('**/login');
  await page.goto(`${base}/app/`);
  await page.waitForURL('**/login');
  assert.deepEqual(errors, []);
  console.log('PASS: signup without a name (KYC provides it); KYC in settings unlocks operating; redesigned raise form (asset tabs, live "recibes hoy", event checklist with states, conditional invoice attachment, submit gated on confirmations); invest live estimate + settlement; seed tier one active op; reload persists; five routes clean 320-1440; no JS errors.');
} finally { await browser.close(); if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } }
