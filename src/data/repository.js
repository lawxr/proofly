import { DEMO_DATE, evaluate, transition } from '../domain/invoices.js';
const KEY = 'proofly-demo-v1';
const checks = { validated: true, received: true, delivered: true, accepted: true };
const companies = ['Estudio Nube', 'Andina Digital', 'Taller Forma', 'Origen Café', 'Nodo Creativo', 'Verde Circular'];
export function seed() {
  return {
    invoices: Array.from({ length: 20 }, (_, i) => ({
      id: `FV-${1024 + i}`, issuer: companies[i % 6] + ' · Demo', payer: ['Grupo Horizonte', 'Comercial Prisma', 'Distribuidora Norte'][i % 3] + ' · Demo',
      amount: [4800000, 12500000, 8200000, 3600000, 6500000, 9700000][i % 6], dueDate: ['2026-12-18', '2027-01-02', '2026-12-03'][i % 3],
      status: i < 3 ? 'funded' : i === 3 ? 'settled' : i === 7 ? 'rejected' : 'available', checks: { ...checks, accepted: i !== 7 }
    })),
    events: [{ id: 'initial', invoiceId: 'FV-1024', title: 'Factura financiada', detail: 'Financiación del 100 % registrada en la demo.', date: DEMO_DATE + 'T10:30:00', kind: 'fund' }]
  };
}
export function createRepository(storage) {
  let state = seed();
  let persistent = true;
  try {
    const raw = storage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved.invoices) || !Array.isArray(saved.events) || saved.invoices.some(i => !i.id || !Number.isFinite(i.amount) || !i.checks)) throw new Error('Invalid demo storage');
      state = saved;
    }
  } catch { persistent = false; }
  function save() {
    try { storage.setItem(KEY, JSON.stringify(state)); } catch { persistent = false; }
  }
  function addEvent(invoiceId, kind, title, detail) {
    state.events.unshift({ id: crypto.randomUUID(), invoiceId, kind, title, detail, date: new Date().toISOString() });
  }
  return {
    list: () => structuredClone(state.invoices),
    events: () => structuredClone(state.events),
    isPersistent: () => persistent,
    add(input) {
      if (state.invoices.some(i => i.id.toLowerCase() === input.id.toLowerCase())) throw new Error('Ya existe una factura con esta referencia.');
      const result = evaluate(input);
      const invoice = { ...input, status: result.eligible ? 'available' : 'rejected' };
      state.invoices.unshift(invoice);
      addEvent(input.id, 'create', 'Factura registrada', result.eligible ? 'Los cinco criterios simulados están completos.' : result.reasons.join(' '));
      save();
      return invoice;
    },
    act(id, action) {
      const index = state.invoices.findIndex(i => i.id === id);
      if (index < 0) throw new Error('No se encontró la factura.');
      state.invoices[index] = transition(state.invoices[index], action);
      addEvent(id, action, action === 'fund' ? 'Factura financiada' : 'Factura liquidada', action === 'fund' ? 'Un financiador demo cubrió el 100 % de la operación.' : 'Liquidación simulada registrada una sola vez.');
      save();
    }
  };
}
