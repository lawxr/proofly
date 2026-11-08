import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { randomInt } from 'node:crypto';
import { createDemoServer } from '../server.mjs';
import { createPrivateApp } from '../scripts/private-app.mjs';
let server;
let base = process.env.BASE_URL;
let pin;
if (base) {
  try { process.loadEnvFile('.env.demo'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  pin = process.env.DEMO_ACCESS_PIN;
} else {
  pin = String(randomInt(0, 10000)).padStart(4, '0');
  const app = await createPrivateApp();
  server = createDemoServer({ pin, appHandler: app.handle.bind(app) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
assert.ok(/^\d{4}$/.test(pin || ''), 'Configure a four-digit local access PIN.');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  await page.waitForURL('**/login');
  const boxes = page.locator('[data-pin-digit]');
  assert.equal(await boxes.count(), 4);
  await boxes.nth(0).fill('1');
  assert.equal(await boxes.nth(1).evaluate(element => element === document.activeElement), true);
  await boxes.nth(1).press('Backspace');
  assert.equal(await boxes.nth(0).inputValue(), '');
  await boxes.nth(0).evaluate((element, pin) => {
    const transfer = new DataTransfer(); transfer.setData('text/plain', pin);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  }, pin);
  assert.ok(await boxes.evaluateAll(elements => elements.map(element => element.value).join('')) === pin, 'Four-box paste failed.');
  await page.screenshot({ path: '/private/tmp/proofly-four-digit-pin.png' });
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL('**/app/');
  // A single identity: the same person invests and raises. Default intent is invest.
  await page.getByRole('heading', { name: 'Haz crecer tu dinero', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '/private/tmp/proofly-violet-app-mobile.png', fullPage: true });
  const ctaAboveDock = await page.locator('.demo-welcome .demo-primary').evaluate(element => element.getBoundingClientRect().bottom < document.querySelector('.demo-mobile-dock').getBoundingClientRect().top - 8);
  assert.ok(ctaAboveDock, 'Home action must remain above the fixed mobile dock.');
  assert.equal(await page.locator('.sidebar').count(), 0, 'The legacy blue UI must not be mounted.');
  // No "demo"/"sandbox" wording anywhere in the visible app.
  const forbidden = await page.evaluate(() => /\b(demo|sandbox|simulad)/i.test(document.body.innerText));
  assert.equal(forbidden, false, 'Visible app must not expose demo/sandbox wording.');
  // The two balances are shown as distinct, labelled cards (never summed).
  await page.getByText('Cupo disponible para adelantos', { exact: true }).waitFor();
  await page.getByText('Capital invertido', { exact: true }).waitFor();
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
  // Switch intent to raise, and create an operation as the same person.
  await page.getByRole('button', { name: 'Financiarme', exact: true }).click();
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
  console.log('PASS: four-box PIN paste/backspace; unified identity (one person invests and raises); no demo wording; two distinct balance cards; market participation + settlement; intent toggle; owner cannot invest in own operation; invoice + milestone creation/confirmation/acceptance; reload; five responsive routes at 320/390/430/768px; desktop; logout; no JS errors.');
} finally { await browser.close(); if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } }
