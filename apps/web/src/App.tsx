import React from 'react';
import './styles/tokens.css';

export function App() {
  return (
    <div className="min-h-screen bg-proofly-canvas text-proofly-black flex flex-col items-center justify-center p-6">
      <header className="max-w-2xl text-center space-y-4">
        <div className="inline-block px-4 py-1.5 rounded-full bg-proofly-lavender text-proofly-electric text-sm font-semibold mb-2">
          Modo Claro Absoluto · Base L2
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight">
          Liquidez para Freelancers.<br />
          <span className="text-proofly-electric">Retornos para Financiadores.</span>
        </h1>
        <p className="text-proofly-muted text-lg">
          Proofly anticipa el cobro de tus facturas o contratos por hitos en COP con total transparencia.
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <button className="proofly-pill-button">
            Solicitar Adelanto
          </button>
          <button className="rounded-full px-6 py-3 border border-black font-semibold hover:bg-proofly-subtle transition-colors">
            Explorar Marketplace
          </button>
        </div>
      </header>

      {/* Tarjeta Bento de Demostración */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 max-w-2xl w-full">
        <div className="proofly-bento-card bg-proofly-subtle flex flex-col justify-between h-48">
          <span className="text-xs font-semibold text-proofly-muted uppercase tracking-wider">Métricas de Retorno</span>
          <div>
            <div className="text-3xl font-black text-proofly-black">+$ 520.000 <small className="text-sm font-normal">COP</small></div>
            <div className="text-sm font-bold text-proofly-emerald mt-1">27.42 % E.A. Promedio</div>
          </div>
        </div>
        <div className="proofly-bento-card bg-proofly-lavender flex flex-col justify-between h-48">
          <span className="text-xs font-semibold text-proofly-electric uppercase tracking-wider">Cupo Semilla Activo</span>
          <div>
            <div className="text-3xl font-black text-proofly-black">$ 2.000.000 <small className="text-sm font-normal">COP</small></div>
            <div className="text-sm font-medium text-proofly-black mt-1">Tier 1 Semilla · 1 Hito Activo</div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;

