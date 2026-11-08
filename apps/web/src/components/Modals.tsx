import React, { useEffect, useRef, useState } from 'react';
import type { Milestone } from '../App';

function formatCOP(val: number) {
  return '$ ' + Math.round(val).toLocaleString('es-CO');
}

// ─── Fund Modal ─────────────────────────────────────────────────────────────

interface FundModalProps {
  open: boolean;
  onClose: () => void;
  milestone: Milestone;
}

export function FundModal({ open, onClose, milestone }: FundModalProps) {
  const [amount, setAmount] = useState(1500000);
  const firstBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) firstBtn.current?.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const total = Math.round(amount * 1.021);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fundModalTitle"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-[32px] border border-ink/15 max-w-md w-full p-7 shadow-2xl space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-electric">Respaldar Operación</span>
            <h3 id="fundModalTitle" className="font-extrabold text-xl text-ink mt-0.5">{milestone.title}</h3>
            <p className="text-xs text-zinc-500">Confirmado por {milestone.company} · {milestone.ea}</p>
          </div>
          <button
            ref={firstBtn}
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-extrabold hover:bg-lilac focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
          >✕</button>
        </div>

        <div className="bg-surface rounded-2xl p-4 space-y-3 border border-ink/10">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500 font-semibold">Monto a participar</span>
            <span className="font-extrabold text-ink tabular-nums">{formatCOP(amount)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([500000, 1500000, 3000000] as const).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val)}
                className={`py-2 rounded-xl text-xs font-extrabold tabular-nums transition-colors ${
                  amount === val
                    ? 'bg-lilac border border-ink/12'
                    : 'bg-white border border-ink/15 hover:bg-lilac'
                }`}
              >
                {val === 500000 ? '$ 500k' : val === 1500000 ? '$ 1,5M' : '$ 3M'}
              </button>
            ))}
          </div>
          <div className="pt-2 border-t border-ink/10 flex justify-between items-baseline">
            <span className="text-xs font-bold text-zinc-600">Recibes al vencimiento</span>
            <span className="font-extrabold text-lg text-electric tabular-nums">{formatCOP(total)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full bg-electric hover:bg-electric text-white font-extrabold text-sm py-4 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
        >
          Confirmar participación
        </button>
      </div>
    </div>
  );
}

// ─── Publish Modal ───────────────────────────────────────────────────────────

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (m: Milestone) => void;
}

export function PublishModal({ open, onClose, onSubmit }: PublishModalProps) {
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title   = (fd.get('title')   as string).trim();
    const company = (fd.get('company') as string).trim();
    const amount  = parseInt(fd.get('amount') as string, 10);
    onSubmit({
      title,
      company,
      initial: company.charAt(0).toUpperCase(),
      amount,
      returnPct: '+1,9%',
      ea: '16,8% E.A.',
      days: 30,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pubModalTitle"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-[32px] border border-ink/15 max-w-md w-full p-7 shadow-2xl space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-electric">Liquidez para Independientes</span>
            <h3 id="pubModalTitle" className="font-extrabold text-xl text-ink mt-0.5">Adelanta tu cobro en pesos</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-extrabold hover:bg-lilac focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label htmlFor="pubTitle" className="font-extrabold text-zinc-700 block mb-1">Entregable o factura</label>
            <input
              ref={titleRef}
              id="pubTitle"
              name="title"
              type="text"
              autoComplete="off"
              required
              placeholder="Ej: Rediseño App Móvil…"
              className="w-full px-4 py-3 rounded-2xl bg-surface border border-ink/15 font-semibold focus:outline-none focus:border-ink/15"
            />
          </div>
          <div>
            <label htmlFor="pubCompany" className="font-extrabold text-zinc-700 block mb-1">Empresa contratante</label>
            <input
              id="pubCompany"
              name="company"
              type="text"
              autoComplete="organization"
              required
              placeholder="Ej: Grupo Éxito…"
              className="w-full px-4 py-3 rounded-2xl bg-surface border border-ink/15 font-semibold focus:outline-none focus:border-ink/15"
            />
          </div>
          <div>
            <label htmlFor="pubAmount" className="font-extrabold text-zinc-700 block mb-1">Valor del entregable (COP)</label>
            <input
              id="pubAmount"
              name="amount"
              type="number"
              inputMode="numeric"
              required
              min={500000}
              step={100000}
              defaultValue={5000000}
              className="w-full px-4 py-3 rounded-2xl bg-surface border border-ink/15 font-extrabold text-base tabular-nums focus:outline-none focus:border-ink/15"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-electric hover:bg-electric text-white font-extrabold text-sm py-4 rounded-full transition-colors mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
          >
            Publicar hito ahora
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

interface ToastProps { text: string; visible: boolean; }

export function Toast({ text, visible }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3.5 rounded-full shadow-lg flex items-center gap-2.5 text-xs font-extrabold transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <span className="w-2 h-2 rounded-full bg-lilac" />
      <span>{text}</span>
    </div>
  );
}
