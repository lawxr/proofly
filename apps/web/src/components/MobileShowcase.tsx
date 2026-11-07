import React, { useState } from 'react';

export const MobileShowcase: React.FC = () => {
  const [phone2Tab, setPhone2Tab] = useState<'overview' | 'activity'>('overview');
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <section id="app-movil" className="px-4 sm:px-6 lg:px-8 py-16 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-proofly-electric block mb-2">
            EXPERIENCIA MÓVIL · MODO CLARO
          </span>
          <h2 className="font-extrabold text-3xl sm:text-5xl lg:text-6xl tracking-tight text-black">
            Liquidez y retornos en tu celular.
          </h2>
        </div>
        <p className="text-sm sm:text-base text-proofly-muted max-w-md font-medium leading-relaxed">
          Diseñado con estética minimalista en lavanda pastel y negro puro. Monitorea entregables, invierte en hitos auditados y transfiere en COP al instante.
        </p>
      </div>

      {/* Stage Container */}
      <div className="rounded-[44px] bg-gradient-to-b from-proofly-lavender/40 via-proofly-lavender/10 to-proofly-subtle border-[2px] border-black/10 p-6 sm:p-10 lg:p-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 items-center justify-items-center">

          {/* ========================================================= */}
          {/* PHONE 1: ONBOARDING & WELCOME (Lavender + Stacked Coins)   */}
          {/* ========================================================= */}
          <div className="w-full max-w-[324px] h-[660px] bg-proofly-lavender rounded-[44px] shadow-phone flex flex-col justify-between overflow-hidden relative border-[2.5px] border-black">
            {/* Status Bar */}
            <div className="px-7 pt-4 flex items-center justify-between text-xs font-black text-black tabular-nums">
              <span>19:27</span>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="tracking-tighter">•••</span>
                <span className="w-4 h-2.5 rounded-[2px] bg-black inline-block"></span>
              </div>
            </div>

            {/* Upper Art: Hand & 3D Violet Coins Stack */}
            <div className="relative flex-1 flex flex-col items-center justify-center px-4">
              <svg className="w-60 h-60" viewBox="0 0 240 240" fill="none" aria-hidden="true">
                {/* Growth Arrow in Background */}
                <path d="M40 50 L110 130 L145 100 L210 185" stroke="#7300FF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M40 42 L110 122 L145 92 L210 177" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                <polygon points="26,26 60,34 36,60" fill="#FFFFFF" stroke="#000000" strokeWidth="2"/>

                {/* Decorative Plus Symbols */}
                <path d="M175 30H185V20H193V30H203V38H193V48H185V38H175V30Z" fill="#7300FF" stroke="#000" strokeWidth="1.5"/>
                <path d="M205 50H215V40H223V50H233V58H223V68H215V58H205V50Z" fill="#E5A8F2" stroke="#000" strokeWidth="1.5"/>

                {/* Hand Dropping Purple Coin */}
                <path d="M240 85 C210 80, 180 62, 150 72 C132 78, 118 96, 126 104 C134 112, 154 96, 170 100 C156 114, 142 126, 150 134 C158 142, 180 122, 196 120 L240 126 Z" fill="#FFFFFF" stroke="#000000" strokeWidth="2"/>
                <ellipse cx="116" cy="118" rx="22" ry="11" fill="#7300FF" stroke="#000000" strokeWidth="2"/>
                <ellipse cx="116" cy="116" rx="16" ry="8" fill="#F8D4FD"/>

                {/* Stack of Purple Coins */}
                <g transform="translate(38, 110)">
                  <ellipse cx="32" cy="74" rx="26" ry="11" fill="#4C00A4" stroke="#000" strokeWidth="1.8"/>
                  <ellipse cx="32" cy="62" rx="26" ry="11" fill="#7300FF" stroke="#000" strokeWidth="1.8"/>
                  <ellipse cx="32" cy="50" rx="26" ry="11" fill="#4C00A4" stroke="#000" strokeWidth="1.8"/>
                  <ellipse cx="32" cy="38" rx="26" ry="11" fill="#7300FF" stroke="#000" strokeWidth="1.8"/>
                  <ellipse cx="32" cy="26" rx="26" ry="11" fill="#E5A8F2" stroke="#000" strokeWidth="1.8"/>
                  <ellipse cx="32" cy="14" rx="26" ry="11" fill="#7300FF" stroke="#000" strokeWidth="1.8"/>
                </g>

                {/* Second Smaller Coin Stack */}
                <g transform="translate(94, 136)">
                  <ellipse cx="28" cy="50" rx="24" ry="10" fill="#4C00A4" stroke="#000" strokeWidth="1.8"/>
                  <ellipse cx="28" cy="38" rx="24" ry="10" fill="#7300FF" stroke="#000" strokeWidth="1.8"/>
                  <ellipse cx="28" cy="26" rx="24" ry="10" fill="#E5A8F2" stroke="#000" strokeWidth="1.8"/>
                  <ellipse cx="28" cy="14" rx="24" ry="10" fill="#7300FF" stroke="#000" strokeWidth="1.8"/>
                </g>
              </svg>
            </div>

            {/* Bottom White Card */}
            <div className="bg-white rounded-t-[36px] px-6 pt-7 pb-6 shadow-card border-t border-black/10">
              <h3 className="font-extrabold text-2xl leading-tight text-center text-black">
                Tu <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-proofly-lavender align-middle text-sm">🔥</span> Puente a<br />
                Liquidez Inmediata
              </h3>
              <p className="text-xs text-proofly-muted text-center mt-2.5 leading-relaxed px-2 font-medium">
                Adelanta tus hitos freelance o respalda entregables con retornos de hasta <strong className="text-proofly-electric font-black tabular-nums">27.4% E.A.</strong>
              </p>

              <button
                type="button"
                className="mt-6 w-full bg-black hover:bg-proofly-electric text-white font-extrabold text-xs py-4 rounded-full transition-all shadow-[0_3px_0_#000000] active:translate-y-0.5"
              >
                Get Started
              </button>

              <button
                type="button"
                className="mt-2.5 w-full text-center text-xs font-bold text-proofly-muted hover:text-black py-1 transition-colors"
              >
                Ingresar como Freelancer
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PHONE 2: INVESTMENT & OPPORTUNITIES HUB (White Canvas)    */}
          {/* ========================================================= */}
          <div className="w-full max-w-[324px] h-[660px] bg-white rounded-[44px] shadow-phone flex flex-col justify-between overflow-hidden relative border-[2.5px] border-black">
            {/* Status Bar */}
            <div className="px-7 pt-4 flex items-center justify-between text-xs font-black text-black tabular-nums">
              <span>19:27</span>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="tracking-tighter">•••</span>
                <span className="w-4 h-2.5 rounded-[2px] bg-black inline-block"></span>
              </div>
            </div>

            {/* User Profile Bar */}
            <div className="px-6 pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-proofly-electric to-proofly-lavender p-0.5 border border-black">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-black text-proofly-electric">
                    PS
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-proofly-muted font-bold flex items-center gap-1">
                    <span>Premium</span>
                    <span>🔥</span>
                  </div>
                  <div className="text-xs font-extrabold text-black">Peter Smith</div>
                </div>
              </div>

              {/* Notification icon */}
              <button
                type="button"
                aria-label="Notificaciones"
                className="w-8 h-8 rounded-full bg-proofly-subtle flex items-center justify-center text-xs text-black border border-black/10"
              >
                🔔
              </button>
            </div>

            {/* Scrollable Center Content */}
            <div className="px-6 pt-2 pb-20 overflow-y-auto no-scrollbar space-y-3.5 flex-1">
              <h3 className="font-extrabold text-2xl text-black tracking-tight">Investment</h3>

              {/* Center Cash Vortex Illustration */}
              <div className="flex flex-col items-center text-center">
                <div className="relative flex items-center justify-center py-1">
                  <div className="w-32 h-24 rounded-full bg-proofly-lavender blur-xl absolute"></div>
                  <svg className="w-36 h-28 relative z-10" viewBox="0 0 180 140" fill="none" aria-hidden="true">
                    <rect x="25" y="30" width="50" height="28" rx="6" transform="rotate(-20 25 30)" fill="#7300FF" stroke="#000" strokeWidth="1.8"/>
                    <rect x="105" y="20" width="50" height="28" rx="6" transform="rotate(18 105 20)" fill="#7300FF" stroke="#000" strokeWidth="1.8"/>
                    <rect x="25" y="75" width="50" height="28" rx="6" transform="rotate(12 25 75)" fill="#F8D4FD" stroke="#000" strokeWidth="1.8"/>
                    <rect x="105" y="72" width="50" height="28" rx="6" transform="rotate(-15 105 72)" fill="#7300FF" stroke="#000" strokeWidth="1.8"/>
                    <circle cx="90" cy="68" r="24" fill="#FFFFFF" stroke="#000" strokeWidth="2"/>
                    <circle cx="90" cy="68" r="18" fill="#F8D4FD"/>
                    <path d="M90 56V68L98 73" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>

                <h4 className="font-extrabold text-base text-black mt-1">Grow Your Wealth Today</h4>
                <p className="text-[11px] text-proofly-muted mt-0.5 max-w-[220px]">
                  Join thousands of investors and start building your portfolio with as little as $1.
                </p>

                <button
                  type="button"
                  className="mt-3 w-full bg-black hover:bg-proofly-electric text-white font-extrabold text-xs py-3.5 rounded-full transition-colors shadow-[0_2px_0_#000000]"
                >
                  Explore more investments
                </button>
              </div>

              {/* Segmented Control Pill Tabs */}
              <div className="bg-proofly-subtle p-1 rounded-full grid grid-cols-2 text-center" role="tablist">
                <button
                  type="button"
                  onClick={() => setPhone2Tab('overview')}
                  role="tab"
                  aria-selected={phone2Tab === 'overview'}
                  className={`py-1.5 rounded-full text-xs font-black transition-all ${
                    phone2Tab === 'overview'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-proofly-muted hover:text-black'
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setPhone2Tab('activity')}
                  role="tab"
                  aria-selected={phone2Tab === 'activity'}
                  className={`py-1.5 rounded-full text-xs font-black transition-all ${
                    phone2Tab === 'activity'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-proofly-muted hover:text-black'
                  }`}
                >
                  Activity
                </button>
              </div>

              {/* Transaction List Item (Matching Reference) */}
              <div className="space-y-2">
                <div className="p-3 bg-proofly-subtle rounded-2xl border border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-proofly-lavender flex items-center justify-center text-xs font-black text-proofly-electric">
                      🏦
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-black">Mandiri-508745653546</p>
                      <p className="text-[10px] text-proofly-muted font-medium">Success, 10.00 AM</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-proofly-emerald tabular-nums">
                    +$500.00
                  </span>
                </div>

                {phone2Tab === 'activity' && (
                  <div className="p-3 bg-proofly-subtle rounded-2xl border border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-xs font-black text-black">
                        ⚡
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-black">Bancolombia ACH</p>
                        <p className="text-[10px] text-proofly-muted font-medium">Liquidado en Base L2</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-proofly-emerald tabular-nums">
                      +$1.250.000 COP
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Floating Glass Dock */}
            <div className="absolute bottom-3 inset-x-5 bg-white/95 backdrop-blur-md border border-black/15 rounded-full p-1.5 flex items-center justify-between shadow-sm z-20">
              <button type="button" aria-label="Inicio" className="w-8 h-8 rounded-full bg-proofly-subtle flex items-center justify-center text-xs font-bold text-black">
                ⌂
              </button>
              <button type="button" className="px-4 py-1.5 rounded-full bg-black text-white text-[11px] font-extrabold flex items-center gap-1.5">
                <span>Invest</span>
              </button>
              <button type="button" aria-label="Billetera" className="w-8 h-8 rounded-full bg-proofly-subtle flex items-center justify-center text-xs font-bold text-black">
                💳
              </button>
              <button type="button" aria-label="Perfil" className="w-8 h-8 rounded-full bg-proofly-subtle flex items-center justify-center text-xs font-bold text-black">
                👤
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PHONE 3: DETAIL & ANALYTICS (2-Column Bento + Promo Banner)*/}
          {/* ========================================================= */}
          <div className="w-full max-w-[324px] h-[660px] bg-white rounded-[44px] shadow-phone flex flex-col justify-between overflow-hidden relative border-[2.5px] border-black md:col-span-2 lg:col-span-1">
            {/* Status Bar */}
            <div className="px-7 pt-4 flex items-center justify-between text-xs font-black text-black tabular-nums">
              <span>19:27</span>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="tracking-tighter">•••</span>
                <span className="w-4 h-2.5 rounded-[2px] bg-black inline-block"></span>
              </div>
            </div>

            {/* Navigation Header */}
            <div className="px-6 pt-3 flex items-center justify-between">
              <button
                type="button"
                aria-label="Volver"
                className="w-8 h-8 rounded-full bg-proofly-subtle flex items-center justify-center text-xs font-bold text-black hover:bg-proofly-lavender transition-colors"
              >
                ←
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Compartir"
                  className="w-8 h-8 rounded-full bg-proofly-subtle flex items-center justify-center text-xs font-bold text-black"
                >
                  ↗
                </button>
                <button
                  type="button"
                  onClick={() => setBookmarked(!bookmarked)}
                  aria-label="Marcar como favorito"
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    bookmarked ? 'bg-proofly-electric text-white' : 'bg-proofly-subtle text-black'
                  }`}
                >
                  ★
                </button>
              </div>
            </div>

            {/* Scrollable Detail Body */}
            <div className="px-6 pt-2 pb-6 overflow-y-auto no-scrollbar space-y-4 flex-1">
              {/* Deliverable Title & Brand */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-lg leading-tight text-black">
                    Invest in Entertainment
                  </h3>
                  <p className="text-[11px] text-proofly-muted mt-0.5 leading-snug">
                    Leading the world in streaming entertainment with over 200M paid memberships.
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                  N
                </div>
              </div>

              {/* 2-Column Bento Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Left Card: Bar Chart */}
                <div className="bg-proofly-subtle rounded-2xl p-3 flex flex-col justify-between border border-black/5">
                  <div>
                    <p className="text-[11px] font-extrabold text-black leading-snug">
                      Analysis of your <span className="text-proofly-electric">portfolio</span>
                    </p>
                    <p className="text-[9px] text-proofly-muted mt-0.5">Active stock performance</p>
                  </div>

                  <div className="pt-3">
                    <div className="flex items-end justify-between h-12 gap-1 px-0.5">
                      <div className="w-2 h-5 bg-proofly-lavender-deep rounded-full"></div>
                      <div className="w-2 h-7 bg-proofly-lavender-deep rounded-full"></div>
                      <div className="w-2 h-4 bg-proofly-lavender-deep rounded-full"></div>
                      <div className="w-2 h-6 bg-proofly-lavender-deep rounded-full"></div>
                      {/* Active Friday Bar in Electric Purple */}
                      <div className="w-2 h-12 bg-proofly-electric rounded-full"></div>
                      <div className="w-2 h-7 bg-proofly-lavender-deep rounded-full"></div>
                      <div className="w-2 h-9 bg-proofly-lavender-deep rounded-full"></div>
                    </div>
                    <div className="flex justify-between text-[8px] font-black text-zinc-400 mt-1 px-0.5">
                      <span>M</span><span>T</span><span>W</span><span>T</span><span className="text-proofly-electric">F</span><span>S</span><span>S</span>
                    </div>
                  </div>
                </div>

                {/* Right Card: Lavender Stat Card */}
                <div className="bg-proofly-lavender rounded-2xl p-3 flex flex-col justify-between border border-black/10">
                  <div>
                    <p className="text-[11px] font-extrabold text-black leading-snug">
                      Strategic insights
                    </p>
                    <p className="text-[9px] text-zinc-700 mt-0.5">Path to wealth growth</p>
                  </div>

                  <div className="pt-2">
                    <div className="font-black text-lg text-black tracking-tight tabular-nums">
                      $640.22
                    </div>
                    <div className="text-[10px] font-black text-proofly-electric mt-0.5 tabular-nums">
                      Avg. 85.2%
                    </div>
                  </div>
                </div>
              </div>

              {/* Black Promo Banner Card: Invest Smarter, Not Harder */}
              <div className="bg-black text-white rounded-2xl p-3.5 relative overflow-hidden shadow-sm">
                <div className="pr-12 space-y-1">
                  <h4 className="font-extrabold text-xs leading-tight">Invest Smarter, Not Harder</h4>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    Access global markets with real-time insights and professional tools.
                  </p>
                  <button
                    type="button"
                    className="mt-2 inline-block bg-white hover:bg-proofly-lavender text-black font-extrabold text-[10px] px-3.5 py-1.5 rounded-full transition-colors"
                  >
                    Learn More
                  </button>
                </div>

                {/* Card Illustration in Background */}
                <div className="absolute right-2 top-2 bottom-2 w-12 flex items-center justify-center opacity-85">
                  <svg className="w-12 h-12" viewBox="0 0 60 60" fill="none">
                    <rect x="5" y="15" width="40" height="25" rx="6" fill="#7300FF" stroke="#FFF" strokeWidth="1.5"/>
                    <circle cx="35" cy="40" r="12" fill="#F8D4FD" stroke="#000" strokeWidth="1.5"/>
                  </svg>
                </div>
              </div>

              {/* Stock Purchase / Recent Items */}
              <div>
                <p className="text-xs font-black text-black mb-2">Stock Purchase</p>
                <div className="space-y-2">
                  {/* Item 1 */}
                  <div className="p-2.5 bg-proofly-subtle rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-proofly-lavender flex items-center justify-center text-xs">
                        🍎
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-black leading-tight">Apple Inc</p>
                        <p className="text-[9px] text-proofly-muted">Tue, 20 January · 10:15 AM</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-proofly-rose bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      -$150.00
                    </span>
                  </div>

                  {/* Item 2 */}
                  <div className="p-2.5 bg-proofly-subtle rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-proofly-lavender flex items-center justify-center text-xs">
                        ⚡
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-black leading-tight">Tesla Motors</p>
                        <p className="text-[9px] text-proofly-muted">Wed, 21 January · 2:45 PM</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-proofly-emerald bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      +$210.50
                    </span>
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
