import { useState, useCallback } from 'react';

function formatCOP(val: number) {
  return '$ ' + Math.round(val).toLocaleString('es-CO');
}

const RATE_PER_30D = 0.013; // ≈16.8% E.A.

interface SimulatorSectionProps {
  onFund:    (amount: number) => void;
  onPublish: () => void;
}

export function SimulatorSection({ onFund, onPublish }: SimulatorSectionProps) {
  const [role,   setRole]   = useState<'funder' | 'freelancer'>('funder');
  const [amount, setAmount] = useState(5_000_000);
  const [days,   setDays]   = useState(30);

  const factor = (RATE_PER_30D * days) / 30;
  const gain   = Math.round(amount * factor);

  const isFunder = role === 'funder';

  const col1Label = isFunder ? 'Capital aportado'           : 'Valor nominal del entregable';
  const col2Label = isFunder ? `Ganancia neta (16,8% E.A.)` : 'Descuento del periodo';
  const col2Val   = isFunder ? `+${formatCOP(gain)}`         : `−${formatCOP(gain)}`;
  const col3Label = isFunder ? 'Total al vencimiento'        : 'Recibes hoy en tu cuenta';
  const col3Val   = isFunder ? formatCOP(amount + gain)      : formatCOP(amount - gain);
  const actionTxt = isFunder ? 'Participar con este monto →' : 'Adelantar este monto hoy →';

  function handleAction() {
    if (isFunder) onFund(amount);
    else          onPublish();
  }

  const syncPresets = useCallback((val: number) => setAmount(val), []);

  return (
    <section id="calculadora" className="max-w-4xl mx-auto pt-4">
      <div className="text-center mb-10">
        <span className="text-xs font-extrabold uppercase tracking-widest text-electric block mb-2">SIMULADOR EN PESOS COLOMBIANOS</span>
        <h2 className="balance-text font-extrabold text-3xl sm:text-5xl tracking-tight text-ink">
          Calcula tu adelanto o tu ganancia al instante.
        </h2>
      </div>

      <div className="bg-white rounded-[36px] border border-ink/15 p-6 sm:p-10 shadow-floating space-y-8">

        {/* Role tabs */}
        <div className="bg-lilac-soft p-1.5 rounded-full grid grid-cols-1 sm:grid-cols-2 gap-1 border border-ink/12/15" role="tablist">
          {([
            { key: 'funder',     label: 'Quiero financiar y ganar retornos' },
            { key: 'freelancer', label: 'Soy freelancer y quiero adelantar mi cobro' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={role === key}
              onClick={() => setRole(key)}
              className={`py-3.5 rounded-full text-xs sm:text-sm font-extrabold transition-all ${
                role === key
                  ? 'bg-electric text-white border border-ink/15 shadow-card'
                  : 'text-zinc-700 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Slider + presets */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex items-baseline justify-between">
              <label htmlFor="simRange" className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
                {isFunder ? 'Monto a participar' : 'Valor de tu hito o factura'}
              </label>
              <span className="font-extrabold text-2xl sm:text-3xl text-electric tabular-nums">{formatCOP(amount)}</span>
            </div>

            <input
              id="simRange"
              type="range"
              min={500_000}
              max={25_000_000}
              step={500_000}
              value={amount}
              onChange={(e) => syncPresets(parseInt(e.target.value, 10))}
              className="proofly-slider"
              aria-label="Seleccionar monto en pesos colombianos"
            />

            <div className="grid grid-cols-4 gap-2 pt-1">
              {[1_000_000, 5_000_000, 10_000_000, 20_000_000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => syncPresets(val)}
                  className={`py-2 rounded-xl text-xs font-extrabold tabular-nums transition-all ${
                    amount === val
                      ? 'border border-ink/12 bg-lilac text-ink'
                      : 'border border-ink/15 bg-surface hover:bg-lilac/50'
                  }`}
                >
                  {val === 1_000_000 ? '$ 1M' : val === 5_000_000 ? '$ 5M' : val === 10_000_000 ? '$ 10M' : '$ 20M'}
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div className="md:col-span-5 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 block">Plazo de pago de la empresa</span>
            <div className="grid grid-cols-3 gap-2">
              {[30, 45, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold tabular-nums transition-all ${
                    days === d
                      ? 'border border-ink/12 bg-lilac text-ink shadow-card'
                      : 'border border-ink/15 bg-surface hover:bg-lilac/50'
                  }`}
                >
                  {d} días
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-lilac-soft rounded-2xl p-5 border border-ink/15">
            <span className="text-xs font-bold text-zinc-600 block">{col1Label}</span>
            <div className="font-extrabold text-2xl text-ink mt-1 tabular-nums">{formatCOP(amount)}</div>
          </div>
          <div className="bg-lilac-soft rounded-2xl p-5 border border-ink/15">
            <span className="text-xs font-bold text-zinc-600 block">{col2Label}</span>
            <div className={`font-extrabold text-2xl mt-1 tabular-nums ${isFunder ? 'text-emerald-600' : 'text-zinc-800'}`}>{col2Val}</div>
          </div>
          <div className="bg-lilac/70 rounded-2xl p-5 border border-ink/12">
            <span className="text-xs font-extrabold text-ink block">{col3Label}</span>
            <div className="font-extrabold text-2xl text-electric mt-1 tabular-nums">{col3Val}</div>
          </div>
        </div>

        {/* Action row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-zinc-500 font-medium">
            Valores en pesos colombianos (COP) con liquidación directa en cuenta de recaudo.
          </p>
          <button
            type="button"
            onClick={handleAction}
            className="w-full sm:w-auto bg-electric hover:bg-electric text-white font-extrabold text-sm px-8 py-4 rounded-full border border-ink/15 shadow-card active:translate-y-0.5 transition-all"
          >
            {actionTxt}
          </button>
        </div>

      </div>
    </section>
  );
}
