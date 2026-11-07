import React, { useRef } from 'react';

export const BentoCarousel: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const bentoItems = [
    {
      step: '01',
      title: 'Adelanto en 2 Horas',
      subtitle: 'Desembolso ACH directo',
      desc: 'Sube tu acta de hito o factura aprobada. Una vez verificada por la empresa, recibes el anticipo de hasta 95% en tu banco colombiano.',
      badge: 'Desembolso Express',
      stat: '2 Horas',
      statLabel: 'Tiempo promedio',
      color: 'bg-white'
    },
    {
      step: '02',
      title: 'Trazabilidad Base L2',
      subtitle: 'Tokens ERC-1155',
      desc: 'Cada hito se acuña como un token ERC-1155 único con HMAC anti-duplicados, garantizando que ninguna factura se anticipe dos veces.',
      badge: 'On-Chain',
      stat: '100%',
      statLabel: 'Trazable y auditable',
      color: 'bg-proofly-lavender'
    },
    {
      step: '03',
      title: 'Motor Financiero Riguroso',
      subtitle: 'Largest Remainder Algorithm',
      desc: 'Cálculo de intereses y comisiones exactas al centavo. Cero desbalance en las cuentas de retorno para el pool de inversionistas.',
      badge: 'Algorítmico',
      stat: '27.42%',
      statLabel: 'E.A. Máx Financiador',
      color: 'bg-white'
    },
    {
      step: '04',
      title: 'Conciliación 3-Vías',
      subtitle: 'DB vs Blockchain vs Banco',
      desc: 'Worker automatizado diario que concilia cada peso entre la base de datos PostgreSQL, los contratos de Base L2 y los extractos bancarios ACH.',
      badge: 'Zero Tolerance',
      stat: '$ 0 COP',
      statLabel: 'Margen de discrepancia',
      color: 'bg-proofly-subtle'
    }
  ];

  return (
    <section id="ecosistema" className="px-4 sm:px-6 lg:px-8 py-16 max-w-7xl mx-auto space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-proofly-electric bg-proofly-lavender border border-black px-3.5 py-1 rounded-full tabular-nums uppercase">
            01–06 Ecosistema
          </span>
          <h2 className="font-extrabold text-3xl sm:text-5xl lg:text-6xl tracking-tight text-black mt-3">
            Todo en un <span className="text-proofly-electric">solo lugar.</span>
          </h2>
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-proofly-muted hidden sm:inline">Desliza para ver más</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Desplazar a la izquierda"
              className="w-11 h-11 rounded-full bg-white border-[2px] border-black shadow-[0_2px_0_#000000] hover:bg-proofly-lavender flex items-center justify-center font-extrabold text-base transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Desplazar a la derecha"
              className="w-11 h-11 rounded-full bg-white border-[2px] border-black shadow-[0_2px_0_#000000] hover:bg-proofly-lavender flex items-center justify-center font-extrabold text-base transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel Track */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-6 overflow-x-auto pb-4 pt-2 no-scrollbar scroll-smooth"
      >
        {bentoItems.map((item, index) => (
          <div
            key={index}
            className={`w-[320px] sm:w-[380px] shrink-0 ${item.color} rounded-[32px] border-[2px] border-black p-7 flex flex-col justify-between shadow-card transition-transform duration-200 hover:-translate-y-1`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-9 h-9 rounded-full bg-black text-white font-extrabold text-xs flex items-center justify-center">
                  {item.step}
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-black/5 border border-black/10">
                  {item.badge}
                </span>
              </div>
              <h3 className="font-extrabold text-2xl text-black tracking-tight">{item.title}</h3>
              <p className="text-xs font-bold text-proofly-electric uppercase tracking-wider mt-1">{item.subtitle}</p>
              <p className="text-sm text-proofly-muted font-medium mt-3 leading-relaxed">{item.desc}</p>
            </div>

            <div className="mt-8 pt-4 border-t border-black/10 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold text-proofly-muted uppercase tracking-wider">{item.statLabel}</p>
                <p className="text-3xl font-black text-black tracking-tight mt-0.5">{item.stat}</p>
              </div>
              <span className="text-proofly-electric font-black text-lg">↗</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
