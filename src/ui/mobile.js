import { icon, logo } from './icons.js';
import { daysUntil } from '../domain/invoices.js';

// Mobile-specific composition; domain state and actions stay in the application.
export function mobileHome() {
  return `<section class="mobile-intro">
    <div class="intro-copy"><span class="intro-kicker">Liquidez para seguir</span>
      <h2>Tu factura<br>también tiene<br><span>valor.</span></h2>
      <p>Anticipa posibilidades.<br>Con claridad en cada paso.</p>
    </div>
    <div class="intro-art" aria-hidden="true">
      <div class="intro-orbit"></div>
      <div class="intro-paper"><div class="intro-paper-brand">${logo()}<span>Factura electrónica</span></div>
        <div class="intro-paper-line"></div><div class="intro-paper-line short"></div>
        <strong>$ 4.800.000</strong><span class="intro-paper-id">FV-1024 · Demo</span>
        <div class="intro-paper-stamp">${icon('check')} Lista para avanzar</div>
      </div>
      <span class="intro-shield">${icon('shield')}</span>
    </div>
    <div class="intro-actions"><button class="button primary full" data-page="invoices">Ver mis facturas ${icon('arrow')}</button>
      <p>Demo con datos ficticios. Sin dinero real.</p>
    </div>
  </section>`;
}

export function mobileInvoiceList(invoices, { escape, money, badge }) {
  return `<div class="mobile-invoice-list" aria-label="Facturas">${invoices.map(invoice => `
    <button class="mobile-invoice" data-detail="${escape(invoice.id)}" aria-label="Ver factura ${escape(invoice.id)}">
      <span class="mobile-invoice-icon">${icon('file')}</span>
      <span class="mobile-invoice-body"><strong>${escape(invoice.issuer.replace(' · Demo', ''))}</strong>
        <span class="mobile-invoice-meta">${escape(invoice.id)} <span>·</span> ${daysUntil(invoice.dueDate)} días</span>
        <span class="mobile-invoice-bottom"><span class="mobile-invoice-amount">${money(invoice.amount)}</span>${badge(invoice.status)}</span>
      </span>
    </button>`).join('')}</div>`;
}

export function mobilePortfolio(invoices, money) {
  const funded = invoices.filter(i => i.status === 'funded');
  const settled = invoices.filter(i => i.status === 'settled');
  const active = funded.reduce((sum, i) => sum + i.amount, 0);
  const closed = settled.reduce((sum, i) => sum + i.amount, 0);
  const total = active + closed;
  const activeShare = total ? Math.round(active / total * 100) : 0;
  return `<section class="mobile-balance"><span class="balance-label">Capital nominal en financiación</span>
    <strong>${money(active)}</strong><p>${funded.length} operaciones activas <span>· COP simulado</span></p>
    <div class="mobile-composition"><div class="composition-header"><h2>Composición</h2><span>Por valor nominal</span></div>
      <div class="composition-track" role="img" aria-label="${activeShare} % financiado, ${total ? 100 - activeShare : 0} % liquidado"><span style="width:${activeShare}%"></span></div>
      <div class="composition-row"><span><i></i> En financiación</span><strong>${money(active)}</strong></div>
      <div class="composition-row settled"><span><i></i> Liquidado</span><strong>${money(closed)}</strong></div>
    </div></section>`;
}
