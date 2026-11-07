import React from 'react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-black/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Wordmark & Starburst */}
        <a href="#" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-proofly-electric rounded-xl">
          <div className="w-10 h-10 rounded-2xl bg-black text-proofly-lavender flex items-center justify-center transition-transform group-hover:scale-105 duration-200 shadow-[0_2px_0_#000000]">
            <svg className="w-6 h-6 text-proofly-lavender" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0L14.8 7.2L22 4.4L16.8 10.4L24 12L16.8 13.6L22 19.6L14.8 16.8L12 24L9.2 16.8L2 19.6L7.2 13.6L0 12L7.2 10.4L2 4.4L9.2 7.2L12 0Z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-2xl tracking-tight text-proofly-black leading-none">Proofly</span>
            <span className="text-[10px] font-bold text-proofly-muted tracking-wider uppercase mt-1">Hitos & Liquidez COP</span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-zinc-700">
          <a href="#ventajas" className="hover:text-proofly-electric transition-colors">Ventajas</a>
          <a href="#ecosistema" className="hover:text-proofly-electric transition-colors">Ecosistema</a>
          <a href="#app-movil" className="hover:text-proofly-electric transition-colors">App Móvil</a>
          <a href="#calculadora" className="hover:text-proofly-electric transition-colors">Calculadora</a>
        </nav>

        {/* Action Button & Network Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-proofly-lavender/60 border border-black/10 text-xs font-bold text-proofly-electric">
            <span className="w-2 h-2 rounded-full bg-proofly-electric animate-pulse"></span>
            <span>Base L2</span>
          </div>
          <a
            href="#app-movil"
            className="proofly-pill-button text-xs sm:text-sm flex items-center gap-2"
          >
            <span>Lanzar App</span>
            <span className="text-proofly-lavender">↗</span>
          </a>
        </div>
      </div>
    </header>
  );
};
