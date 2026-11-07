import React from 'react';

export const ValueProposition: React.FC = () => {
  return (
    <section id="ventajas" className="px-4 sm:px-6 lg:px-8 py-16 max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-proofly-lavender via-[#FBE5FF] to-proofly-subtle text-black rounded-[44px] p-6 sm:p-12 lg:p-16 relative overflow-hidden border-[2px] border-black shadow-card">
        
        {/* Background Decorative Starbursts */}
        <svg className="absolute -top-24 -left-24 w-96 h-96 text-proofly-lavender-deep/30 pointer-events-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0L14.8 7.2L22 4.4L16.8 10.4L24 12L16.8 13.6L22 19.6L14.8 16.8L12 24L9.2 16.8L2 19.6L7.2 13.6L0 12L7.2 10.4L2 4.4L9.2 7.2L12 0Z"/>
        </svg>
        <svg className="absolute -bottom-28 right-1/4 w-80 h-80 text-white/50 pointer-events-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0L14.8 7.2L22 4.4L16.8 10.4L24 12L16.8 13.6L22 19.6L14.8 16.8L12 24L9.2 16.8L2 19.6L7.2 13.6L0 12L7.2 10.4L2 4.4L9.2 7.2L12 0Z"/>
        </svg>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Copy, Button & Handwritten Callout */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 bg-white border-[1.5px] border-black rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider text-proofly-electric shadow-[0_2px_0_#000000]">
              <span className="w-2 h-2 rounded-full bg-proofly-electric"></span>
              <span>LIQUIDEZ INMEDIATA EN COP</span>
            </div>

            <h2 className="font-extrabold text-3xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-black">
              Cobra hoy sin<br />
              <span className="text-proofly-electric">esperar a 60 días.</span>
            </h2>

            <p className="text-base sm:text-lg text-zinc-800 max-w-lg font-medium leading-relaxed">
              Tus empresas clientes mantienen su plazo habitual de pago a 30 o 60 días, mientras Proofly convierte cada entregable aprobado en pesos colombianos directos a tu cuenta bancaria.
            </p>

            <div className="pt-2">
              <a
                href="#app-movil"
                className="inline-block proofly-pill-button text-sm sm:text-base px-8 py-4"
              >
                Empezar a Adelantar
              </a>
            </div>

            {/* Handwritten Note with Curved SVG Arrow */}
            <div className="pt-4 flex items-center gap-3">
              <div className="font-hand text-2xl sm:text-3xl font-bold text-black -rotate-3 leading-tight">
                Plazo cómodo para la empresa,<br />
                <span className="text-proofly-electric">efectivo hoy para ti</span>
              </div>
              <svg className="w-14 h-14 text-proofly-electric shrink-0" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <path d="M12 14 C8 40, 26 52, 52 48" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <path d="M43 40 L53 48 L44 56" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Right Column: Live Product Card */}
          <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[500px]">
              
              <div className="bg-white border-[2px] border-black rounded-[32px] shadow-card p-6 sm:p-8 relative overflow-hidden">
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-black/10 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-black text-proofly-lavender flex items-center justify-center font-black">
                      <svg className="w-5 h-5 text-proofly-lavender" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0L14.8 7.2L22 4.4L16.8 10.4L24 12L16.8 13.6L22 19.6L14.8 16.8L12 24L9.2 16.8L2 19.6L7.2 13.6L0 12L7.2 10.4L2 4.4L9.2 7.2L12 0Z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-extrabold text-base text-black">Proofly</p>
                      <p className="text-xs text-proofly-muted font-semibold">Operación #PRF-2026-081</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 bg-proofly-subtle border border-black/10 rounded-full px-3 py-1 text-xs font-bold text-proofly-electric">
                    <span className="w-2 h-2 rounded-full bg-proofly-electric"></span>
                    VERIFICADO COP
                  </span>
                </div>

                {/* Milestone Info */}
                <div className="pt-6 pb-4 flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-proofly-muted uppercase tracking-wider">Entregable Aprobado</span>
                    <h3 className="font-extrabold text-lg text-black mt-0.5">Diseño de plataforma digital</h3>
                    <p className="text-xs text-proofly-muted mt-1">Factura verificada con plazo de 60 días</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-proofly-lavender border border-black/15 flex items-center justify-center text-proofly-electric font-black text-lg">
                    ✓
                  </div>
                </div>

                {/* Liquidity Amount Banner */}
                <div className="rounded-[24px] bg-proofly-subtle border border-black/10 p-5 mt-2 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-600">
                    <span>Liquidez disponible</span>
                    <span className="rounded-full bg-black text-white text-[10px] font-extrabold px-3 py-1">INMEDIATO ↗</span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight mt-2">
                    $ 8.347.000 <span className="text-base font-normal text-proofly-muted">COP</span>
                  </p>
                  <p className="text-xs text-proofly-muted font-medium mt-1">Directo a tu cuenta Bancolombia / Davivienda.</p>
                </div>

                {/* 3-Step Progress */}
                <div className="pt-6 pb-2">
                  <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">01</span>
                    <span className="h-[2px] bg-proofly-electric/40"></span>
                    <span className="w-8 h-8 rounded-full bg-proofly-electric text-white text-xs font-bold flex items-center justify-center">02</span>
                    <span className="h-[2px] bg-proofly-electric/40"></span>
                    <span className="w-8 h-8 rounded-full bg-proofly-lavender border border-black/20 text-black text-xs font-bold flex items-center justify-center">03</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-2 text-center text-xs font-bold text-zinc-600">
                    <span>Hito validado</span>
                    <span>Adelanto ACH</span>
                    <span>Cobro en COP</span>
                  </div>
                </div>

              </div>

              {/* Floating verified badge */}
              <div className="absolute -bottom-4 -left-3 sm:-left-6 z-20 rounded-2xl bg-black text-white px-4 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.18)] -rotate-3 border border-black">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-proofly-lavender text-black font-extrabold flex items-center justify-center text-xs">✓</span>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-proofly-lavender font-extrabold">Operación</p>
                    <p className="text-xs font-extrabold text-white">Hito verificado en Base L2</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
