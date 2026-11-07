import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-proofly-subtle border-t border-black/10 pt-16 pb-12 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black text-proofly-lavender flex items-center justify-center">
                <svg className="w-5 h-5 text-proofly-lavender" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0L14.8 7.2L22 4.4L16.8 10.4L24 12L16.8 13.6L22 19.6L14.8 16.8L12 24L9.2 16.8L2 19.6L7.2 13.6L0 12L7.2 10.4L2 4.4L9.2 7.2L12 0Z"/>
                </svg>
              </div>
              <span className="font-black text-2xl tracking-tight text-black">Proofly</span>
            </div>
            <p className="text-xs text-proofly-muted font-medium leading-relaxed">
              Infraestructura fintech para la liquidez de freelancers y retornos verificados sobre Base L2 en pesos colombianos.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-proofly-lavender border border-black/10 text-[11px] font-black text-proofly-electric">
              <span>●</span>
              <span>Base L2 Mainnet Ready</span>
            </div>
          </div>

          {/* Column 2: Producto */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-black">Producto</p>
            <ul className="space-y-2 text-xs font-semibold text-proofly-muted">
              <li><a href="#ventajas" className="hover:text-proofly-electric transition-colors">Adelanto por Hitos</a></li>
              <li><a href="#app-movil" className="hover:text-proofly-electric transition-colors">Marketplace de Inversión</a></li>
              <li><a href="#calculadora" className="hover:text-proofly-electric transition-colors">Simulador de Tiers</a></li>
              <li><a href="#ecosistema" className="hover:text-proofly-electric transition-colors">Ecosistema Base L2</a></li>
            </ul>
          </div>

          {/* Column 3: Infraestructura */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-black">Arquitectura</p>
            <ul className="space-y-2 text-xs font-semibold text-proofly-muted">
              <li><span className="text-zinc-600">Smart Contracts ERC-1155</span></li>
              <li><span className="text-zinc-600">HMAC Anti-Duplicados</span></li>
              <li><span className="text-zinc-600">Worker Conciliador 3-Vías</span></li>
              <li><span className="text-zinc-600">PostgreSQL SKIP LOCKED</span></li>
            </ul>
          </div>

          {/* Column 4: Legal & Cumplimiento */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-black">Cumplimiento</p>
            <ul className="space-y-2 text-xs font-semibold text-proofly-muted">
              <li><span className="text-zinc-600">Términos de Servicio COP</span></li>
              <li><span className="text-zinc-600">Custodia & Trazabilidad L2</span></li>
              <li><span className="text-zinc-600">KYC Registro de Operadores</span></li>
              <li><span className="text-zinc-600">Sandbox Fintech Colombia</span></li>
            </ul>
          </div>
        </div>

        {/* Oversized Brand Display */}
        <div className="pt-8 border-t border-black/10 flex flex-col items-center justify-center text-center select-none overflow-hidden">
          <span className="font-black text-6xl sm:text-8xl lg:text-[140px] leading-none tracking-tighter text-proofly-electric/15">
            PROOFLY
          </span>
        </div>

        {/* Bottom Legal Disclaimer */}
        <div className="pt-6 border-t border-black/10 flex flex-col sm:flex-row items-center justify-between text-[11px] font-medium text-proofly-muted gap-4">
          <p>© 2026 Proofly Technologies. Todos los derechos reservados.</p>
          <p className="max-w-xl text-center sm:text-right">
            Proofly opera como plataforma de liquidez e infraestructura sobre Base L2. Liquidación en pesos colombianos (COP).
          </p>
        </div>
      </div>
    </footer>
  );
};
