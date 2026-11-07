// Pure business rules. No browser, storage, or blockchain dependencies.
export const DEMO_DATE = '2026-11-03';
export const DAY = 86400000;
export function daysUntil(date, today = DEMO_DATE) {
  return Math.ceil((Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / DAY);
}
export function evaluate(invoice, today = DEMO_DATE) {
  const reasons = [];
  if (!Number.isFinite(invoice.amount) || invoice.amount <= 0) reasons.push('El valor debe ser mayor que cero.');
  if (!Number.isFinite(daysUntil(invoice.dueDate, today)) || daysUntil(invoice.dueDate, today) <= 0) reasons.push('La factura está vencida o no tiene una fecha válida.');
  const labels = { validated: 'Validación DIAN simulada', received: 'Acuse de recibo simulado', delivered: 'Recibo de bienes o servicios simulado', accepted: 'Aceptación del pagador simulada' };
  for (const [key, label] of Object.entries(labels)) if (!invoice.checks?.[key]) reasons.push(`Falta: ${label.toLowerCase()}.`);
  return { eligible: reasons.length === 0, reasons };
}
export function quote(amount, days, rate = 0.02) {
  if (![amount, days, rate].every(Number.isFinite) || amount <= 0 || days <= 0 || rate < 0) throw new Error('Los datos de la oferta no son válidos.');
  const discount = Math.round(amount * rate * days / 30);
  return { amount, days, rate, discount, fee: 0, net: amount - discount };
}
export function transition(invoice, action, today = DEMO_DATE) {
  if (action === 'fund' && invoice.status === 'available' && evaluate(invoice, today).eligible) return { ...invoice, status: 'funded' };
  if (action === 'settle' && invoice.status === 'funded') return { ...invoice, status: 'settled' };
  throw new Error('Esta operación no está disponible para el estado actual de la factura.');
}
