import React, { useState, useMemo } from 'react';

export const SimulatorSection: React.FC = () => {
  const [nominalCOP, setNominalCOP] = useState<number>(8000000);
  const [termDays, setTermDays] = useState<number>(30);
  const [tier, setTier] = useState<1 | 2 | 3>(2);

  const calculations = useMemo(() => {
    // Annualized discount rate based on tier
    // Tier 1: 27.42% EA, Tier 2: 24.50% EA, Tier 3: 21.00% EA
    const eaRate = tier === 1 ? 0.2742 : tier === 2 ? 0.2450 : 0.2100;
    const nominalRate = Math.pow(1 + eaRate, termDays / 365) - 1;
    
    const platformFeeRate = 0.015; // 1.5% fixed platform fee
    const platformFee = Math.round(nominalCOP * platformFeeRate);
    const financierReturn = Math.round(nominalCOP * nominalRate);
    const advanceAmount = Math.max(0, nominalCOP - platformFee - financierReturn);

    const advancePercentage = ((advanceAmount / nominalCOP) * 100).toFixed(1);

    return {
      nominalCOP,
      advanceAmount,
      platformFee,
      financierReturn,
      advancePercentage,
      eaRateText: (eaRate * 100).toFixed(2)
    };
  }, [nominalCOP, termDays, tier]);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <section id="calculadora" className="px-4 sm:px-6 lg:px-8 py-16 max-w-7xl mx-auto space-y-8">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-proofly-electric bg-proofly-lavender border border-black px-4 py-1.5 rounded-full uppercase">
          SIMULADOR FINANCIERO · TIERS COP
        </span>
        <h2 className="font-extrabold text-3xl sm:text-5xl tracking-tight text-black">
          Calcula tu liquidez al instante.
        </h2>
        <p className="text-sm sm:text-base text-proofly-muted font-medium">
          Ajusta el valor de tu hito o contrato y conoce cuánto recibes hoy en tu cuenta y el retorno para quienes respaldan tu trabajo.
        </p>
      </div>

      {/* Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Sliders & Controls */}
        <div className="lg:col-span-7 bg-white rounded-[36px] border-[2px] border-black p-6 sm:p-10 shadow-card flex flex-col justify-between space-y-6">
          
          {/* Tier Selection */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-proofly-muted block mb-3">
              Nivel de Reputación Freelancer
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setTier(1)}
                className={`p-3 rounded-2xl border-[1.5px] text-left transition-all ${
                  tier === 1
                    ? 'border-black bg-proofly-lavender font-extrabold text-black shadow-sm'
                    : 'border-black/15 bg-proofly-subtle text-zinc-600 hover:border-black/40'
                }`}
              >
                <div className="text-xs font-black">Tier 1 Semilla</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Hasta $2M COP</div>
              </button>

              <button
                type="button"
                onClick={() => setTier(2)}
                className={`p-3 rounded-2xl border-[1.5px] text-left transition-all ${
                  tier === 2
                    ? 'border-black bg-proofly-lavender font-extrabold text-black shadow-sm'
                    : 'border-black/15 bg-proofly-subtle text-zinc-600 hover:border-black/40'
                }`}
              >
                <div className="text-xs font-black">Tier 2 Crecimiento</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Hasta $8M COP</div>
              </button>

              <button
                type="button"
                onClick={() => setTier(3)}
                className={`p-3 rounded-2xl border-[1.5px] text-left transition-all ${
                  tier === 3
                    ? 'border-black bg-proofly-lavender font-extrabold text-black shadow-sm'
                    : 'border-black/15 bg-proofly-subtle text-zinc-600 hover:border-black/40'
                }`}
              >
                <div className="text-xs font-black">Tier 3 Consolidado</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Hasta $25M COP</div>
              </button>
            </div>
          </div>

          {/* Slider 1: Deliverable Value */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-xs font-black uppercase tracking-wider text-proofly-muted">
                Valor del Entregable
              </span>
              <span className="text-2xl font-black text-black tabular-nums">
                {formatCOP(nominalCOP)}
              </span>
            </div>
            <input
              type="range"
              min={1000000}
              max={25000000}
              step={500000}
              value={nominalCOP}
              onChange={(e) => setNominalCOP(Number(e.target.value))}
              className="w-full h-3 bg-proofly-subtle rounded-lg appearance-none cursor-pointer accent-black"
            />
            <div className="flex justify-between text-[11px] font-bold text-zinc-400">
              <span>$ 1.000.000 COP</span>
              <span>$ 25.000.000 COP</span>
            </div>
          </div>

          {/* Slider 2: Term in Days */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-xs font-black uppercase tracking-wider text-proofly-muted">
                Plazo de Pago de la Empresa
              </span>
              <span className="text-2xl font-black text-proofly-electric tabular-nums">
                {termDays} días
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={90}
              step={5}
              value={termDays}
              onChange={(e) => setTermDays(Number(e.target.value))}
              className="w-full h-3 bg-proofly-subtle rounded-lg appearance-none cursor-pointer accent-proofly-electric"
            />
            <div className="flex justify-between text-[11px] font-bold text-zinc-400">
              <span>15 días</span>
              <span>60 días (Estándar)</span>
              <span>90 días</span>
            </div>
          </div>

        </div>

        {/* Right Column: Results Bento Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-proofly-lavender via-[#F9DCFE] to-white rounded-[36px] border-[2px] border-black p-6 sm:p-10 shadow-card flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-black/10 pb-4">
              <span className="text-xs font-black uppercase tracking-wider text-black">
                Desglose Financiero
              </span>
              <span className="px-3 py-1 rounded-full bg-black text-white text-[10px] font-black uppercase">
                {calculations.advancePercentage}% Adelantado
              </span>
            </div>

            {/* Big Liquidity Payout */}
            <div className="mt-6">
              <p className="text-xs font-bold text-proofly-muted uppercase tracking-wider">
                Liquidez Inmediata en COP
              </p>
              <p className="text-4xl sm:text-5xl font-black text-black tracking-tight mt-1 tabular-nums">
                {formatCOP(calculations.advanceAmount)}
              </p>
              <p className="text-xs text-zinc-700 font-semibold mt-1">
                Disponible en tu cuenta bancaria en menos de 2 horas.
              </p>
            </div>

            {/* Breakdown List */}
            <div className="mt-6 space-y-3 pt-4 border-t border-black/10 text-xs font-bold">
              <div className="flex justify-between text-zinc-700">
                <span>Comisión de Plataforma Proofly (1.5%):</span>
                <span className="tabular-nums font-black text-black">{formatCOP(calculations.platformFee)}</span>
              </div>
              <div className="flex justify-between text-zinc-700">
                <span>Retorno Pool de Financiadores ({calculations.eaRateText}% E.A.):</span>
                <span className="tabular-nums font-black text-proofly-electric">{formatCOP(calculations.financierReturn)}</span>
              </div>
              <div className="flex justify-between text-zinc-700 pt-2 border-t border-black/10">
                <span>Valor Nominal Facturado:</span>
                <span className="tabular-nums font-black text-black">{formatCOP(calculations.nominalCOP)}</span>
              </div>
            </div>
          </div>

          <a
            href="#app-movil"
            className="w-full text-center proofly-pill-button text-sm py-4 block"
          >
            Solicitar Adelanto de Este Monto ↗
          </a>
        </div>

      </div>
    </section>
  );
};
