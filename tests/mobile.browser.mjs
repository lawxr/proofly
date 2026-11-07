import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3096');
  await page.locator('.mobile-intro h2').waitFor({ state: 'visible', timeout: 3000 });
  assert.equal(await page.locator('.metrics').isVisible(), false);
  await page.getByRole('button', { name: 'Ver mis facturas', exact: true }).click();
  await page.locator('.mobile-invoice-list').waitFor({ state: 'visible' });
  assert.equal(await page.locator('main table').isVisible(), false);
  await page.getByRole('button', { name: 'Registrar factura', exact: true }).click();
  await page.locator('[name=reference]').fill('MOBILE-TEST-001');
  await page.getByRole('button', { name: 'Registrar y evaluar' }).click();
  await page.getByRole('heading', { name: 'MOBILE-TEST-001' }).waitFor();
  await page.getByRole('button', { name: 'Simular financiación' }).click();
  await page.locator('nav [data-page=portfolio]').click();
  await page.locator('.mobile-balance').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Ver factura MOBILE-TEST-001', exact: true }).click();
  await page.getByRole('button', { name: 'Simular liquidación' }).click();
  await page.reload();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('proofly-demo-v1')).invoices.find(i => i.id === 'MOBILE-TEST-001').status), 'settled');
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['home', 'invoices', 'market', 'portfolio', 'history']) {
      await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:3096'}/#${route}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route} overflows at ${width}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:3096'}/#invoices`);
  assert.equal(await page.locator('main table').isVisible(), true);
  assert.equal(await page.locator('.mobile-invoice-list').isVisible(), false);
  await page.getByRole('searchbox').fill('MOBILE-TEST-001');
  assert.equal(await page.locator('tbody tr').count(), 1);
  assert.deepEqual(errors, []);
  console.log('PASS: mobile introduction, card list, create, quote, finance, settle, persistence, five routes at 320/390/430px, desktop table and search, no JS errors.');
} finally { await browser.close(); }
