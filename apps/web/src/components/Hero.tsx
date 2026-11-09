import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, DESKTOP_QUERY, splitChars } from '../lib/gsap';

interface HeroProps {
  onPublish: () => void;
  onSimulate: () => void;
  onEcosistema: () => void;
  onAppMovil: () => void;
}

/** Inline rotation (deg) each satellite ships with — must be preserved by GSAP. */
const SATELLITE_ROTATION: Record<string, number> = {
  'proofly-satellite-one': -9,
  'proofly-satellite-two': 11,
  'proofly-satellite-three': -11,
  'proofly-satellite-four': -14,
  'proofly-satellite-five': -8,
};

export function Hero({ onPublish, onSimulate, onEcosistema, onAppMovil }: HeroProps) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context((self) => {
      const q = self.selector!;

      /* ── S1: Title scroll-scrubbed reveal (opacity 0.2 → 1 per char) ── */
      const h1 = q('h1')[0] as HTMLElement | undefined;
      if (h1) {
        const chars = splitChars(h1);
        gsap.set(chars, { opacity: 0.2 });
        gsap.to(chars, {
          opacity: 1,
          ease: 'none',
          stagger: 0.5,
          scrollTrigger: {
            trigger: h1,
            start: 'top 80%',
            end: 'center center',
            scrub: true,
          },
        });
      }

      /* ── Desktop-only satellite choreography (hidden lg:flex) ── */
      const mm = gsap.matchMedia();
      mm.add(DESKTOP_QUERY, () => {
        const cards = q('.polaroid-card') as HTMLElement[];

        cards.forEach((card, i) => {
          const satelliteClass =
            Object.keys(SATELLITE_ROTATION).find((c) => card.classList.contains(c)) ?? '';
          const rotation = SATELLITE_ROTATION[satelliteClass] ?? 0;

          // S2: spring-ish entrance (scale 0.8→1, opacity 0→1) preserving rotation.
          gsap.fromTo(
            card,
            { opacity: 0, scale: 0.8, rotation },
            {
              opacity: 1,
              scale: 1,
              rotation,
              duration: 1.1,
              delay: 0.15 + i * 0.09,
              ease: 'elastic.out(1, 0.6)',
              onComplete: () => {
                // S3: idle infinite Y float, staggered so they drift out of sync.
                gsap.to(card, {
                  y: 8,
                  duration: 3 + (i % 3) * 0.5,
                  ease: 'sine.inOut',
                  repeat: -1,
                  yoyo: true,
                  delay: i * 0.4,
                  startAt: { y: -8 },
                });
              },
            },
          );

          // S4: scroll parallax — each card drifts on Y at a different speed.
          gsap.to(card, {
            yPercent: -12 - i * 6,
            ease: 'none',
            scrollTrigger: {
              trigger: root,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        });
      });
    }, root);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <section id="hero" className="proofly-hero" ref={rootRef}>
        <header className="w-full flex items-center justify-between relative z-30 proofly-header">
          <a href="#" aria-label="Proofly Inicio" className="inline-flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric rounded-lg">
            <span className="font-script text-3xl sm:text-4xl tracking-tight text-ink select-none">Proofly</span>
          </a>

          <details className="proofly-mobile-menu lg:hidden ml-auto">
            <summary className="min-h-11 min-w-11 rounded-full border border-electric/20 flex items-center justify-center text-electric cursor-pointer" aria-label="Abrir navegación">☰</summary>
            <div className="absolute right-0 top-full bg-white border border-electric/15 rounded-2xl shadow-card p-3 w-56 flex flex-col text-sm text-ink">
              <a className="px-4 py-3 hover:bg-lilac-soft rounded-xl" href="#ventajas">Ventajas</a>
              <a className="px-4 py-3 hover:bg-lilac-soft rounded-xl" href="#ecosistema">Ecosistema</a>
              <a className="px-4 py-3 hover:bg-lilac-soft rounded-xl" href="#ventajas">Cómo funciona</a>
              <button type="button" onClick={onSimulate} className="px-4 py-3 hover:bg-lilac-soft rounded-xl text-left">Financiar talento</button>
            </div>
          </details>
          <nav aria-label="Navegación principal" className="bg-white/90 text-ink border border-electric/15 rounded-full p-1.5 pl-5 sm:pl-7 flex items-center gap-4 sm:gap-6 shadow-pill-nav">
            <button onClick={() => document.getElementById('ventajas')?.scrollIntoView({ behavior: 'smooth' })} className="hidden lg:inline-block text-[11px] font-bold tracking-wider uppercase text-ink-soft hover:text-electric transition-colors bg-transparent border-0 cursor-pointer">Ventajas</button>
            <button onClick={onEcosistema} className="hidden lg:inline-block text-[11px] font-bold tracking-wider uppercase text-ink-soft hover:text-electric transition-colors bg-transparent border-0 cursor-pointer">Ecosistema</button>
            <button onClick={onAppMovil} className="hidden lg:inline-block text-[11px] font-bold tracking-wider uppercase text-ink-soft hover:text-electric transition-colors bg-transparent border-0 cursor-pointer">Cómo funciona</button>
            <button onClick={onSimulate} className="hidden lg:inline-block text-[11px] font-bold tracking-wider uppercase text-ink-soft hover:text-electric transition-colors bg-transparent border-0 cursor-pointer">Financiar talento</button>
            <button
              type="button"
              onClick={onPublish}
              className="bg-electric hover:bg-electric-dark text-white text-xs font-extrabold pl-4 pr-2 py-2 rounded-full border border-transparent transition-all flex items-center gap-2"
            >
              <span>Empezar</span>
              <span className="w-5 h-5 rounded-full bg-white text-ink flex items-center justify-center text-[10px] font-black" aria-hidden="true">↗</span>
            </button>
          </nav>
        </header>



        <svg className="absolute w-[620px] h-[620px] text-surface left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0L15 7L22 4L17 10L24 12L17 14L22 20L15 17L12 24L9 17L2 20L7 14L0 12L7 10L2 4L9 7Z" />
        </svg>
        {/* ── Polaroid stickers (desktop only) ── */}

        {/* Sticker 1 — top left */}
        <button
          type="button"
          onClick={onPublish}
          aria-label="Liquidez por Hitos"
          className="polaroid-card hidden lg:flex flex-col absolute proofly-satellite-one z-30 w-36 bg-white border border-ink/15 rounded-[22px] p-2.5 shadow-sticker hover:shadow-sticker-hover cursor-pointer"
          style={{ transform: 'rotate(-9deg)' }}
        >
          <div className="w-full h-28 rounded-[14px] bg-gradient-to-br from-[#EFE5FF] via-lilac to-white border border-ink/10 flex items-center justify-center overflow-hidden">
            <svg className="w-20 h-20" viewBox="0 0 120 120" fill="none" aria-hidden="true" filter="url(#soft3DShadow)">
              <g transform="translate(10,8)">
                <rect x="12" y="12" width="36" height="36" rx="16" fill="url(#clayViolet)" stroke="#7300FF" strokeWidth="2.2"/>
                <ellipse cx="24" cy="22" rx="8" ry="4" transform="rotate(-25 24 22)" fill="#FFFFFF" fillOpacity="0.65"/>
                <rect x="52" y="12" width="36" height="36" rx="16" fill="url(#clayLilac)" stroke="#7300FF" strokeWidth="2.2"/>
                <rect x="12" y="52" width="36" height="36" rx="16" fill="url(#clayLilac)" stroke="#7300FF" strokeWidth="2.2"/>
                <rect x="52" y="52" width="36" height="36" rx="16" fill="url(#clayViolet)" stroke="#7300FF" strokeWidth="2.2"/>
                <circle cx="50" cy="50" r="14" fill="#FFFFFF" stroke="#7300FF" strokeWidth="2.2"/>
                <path d="M44 50L48 54L57 45" stroke="#7300FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </svg>
          </div>
          <span className="text-xs font-extrabold text-ink mt-2 mb-0.5 tracking-tight">Liquidez por Hitos</span>
        </button>

        {/* Sticker 2 — right edge */}
        <button
          type="button"
          onClick={onSimulate}
          aria-label="Cobro Sencillo"
          className="polaroid-card hidden lg:flex flex-col absolute proofly-satellite-two z-30 w-40 bg-white border border-ink/15 rounded-[22px] p-2.5 shadow-sticker hover:shadow-sticker-hover cursor-pointer"
          style={{ transform: 'rotate(11deg)' }}
        >
          <div className="w-full h-32 rounded-[14px] bg-gradient-to-tr from-[#FFF0FA] via-lilac/75 to-[#EFE5FF] border border-ink/10 flex items-center justify-center overflow-hidden">
            <svg className="w-28 h-24" viewBox="0 0 130 110" fill="none" aria-hidden="true" filter="url(#soft3DShadow)">
              <g transform="rotate(-10 65 55)">
                <rect x="18" y="28" width="84" height="54" rx="12" fill="#E5A8F2" stroke="#7300FF" strokeWidth="2"/>
                <rect x="14" y="22" width="84" height="54" rx="12" fill="url(#clayViolet)" stroke="#7300FF" strokeWidth="2.2"/>
                <rect x="24" y="33" width="18" height="13" rx="4" fill="#F8D4FD" stroke="#7300FF" strokeWidth="1.8"/>
                <line x1="24" y1="60" x2="64" y2="60" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round"/>
                <circle cx="90" cy="27" r="18" fill="url(#clayLilac)" stroke="#7300FF" strokeWidth="2.2"/>
                <path d="M92 17L84 28H91L88 37L97 25H90L92 17Z" fill="#7300FF" stroke="#7300FF" strokeWidth="1.2" strokeLinejoin="round"/>
              </g>
            </svg>
          </div>
          <span className="text-xs font-extrabold text-ink mt-2 mb-0.5 tracking-tight">Cobro Sencillo</span>
        </button>

        {/* Sticker 3 — left edge */}
        <button
          type="button"
          onClick={onEcosistema}
          aria-label="Más Ingresos"
          className="polaroid-card hidden lg:flex flex-col absolute proofly-satellite-three z-30 w-40 bg-white border border-ink/15 rounded-[22px] p-2.5 shadow-sticker hover:shadow-sticker-hover cursor-pointer"
          style={{ transform: 'rotate(-11deg)' }}
        >
          <div className="w-full h-32 rounded-[14px] bg-gradient-to-br from-[#EFE5FF] via-lilac/70 to-white border border-ink/10 flex items-center justify-center overflow-hidden">
            <svg className="w-24 h-24 relative z-10" viewBox="0 0 120 120" fill="none" aria-hidden="true">
              <rect x="20" y="72" width="18" height="29" rx="6" fill="url(#clayLilac)" stroke="#7300FF" strokeWidth="2" />
              <rect x="48" y="53" width="18" height="48" rx="6" fill="url(#clayLavender)" stroke="#7300FF" strokeWidth="2" />
              <rect x="76" y="32" width="18" height="69" rx="6" fill="url(#clayViolet)" stroke="#7300FF" strokeWidth="2" />
              <path d="M22 51L48 33L67 36L95 14M79 14H95V30" stroke="#7300FF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="27" cy="88" r="20" fill="#FFFFFF" stroke="#7300FF" strokeWidth="2.5" />
              <text x="27" y="96" textAnchor="middle" fill="#7300FF" fontSize="25" fontWeight="800" fontFamily="Plus Jakarta Sans">$</text>
            </svg>
          </div>
          <span className="text-xs font-extrabold text-ink mt-2 mb-0.5 tracking-tight">Más Ingresos</span>
        </button>

        {/* Sticker 4 — bottom left */}
        <button
          type="button"
          onClick={onAppMovil}
          aria-label="Sin Fricción"
          className="polaroid-card hidden lg:flex flex-col absolute proofly-satellite-four z-30 w-36 bg-white border border-ink/15 rounded-[22px] p-2.5 shadow-sticker hover:shadow-sticker-hover cursor-pointer"
          style={{ transform: 'rotate(-14deg)' }}
        >
          <div className="w-full h-28 rounded-[14px] bg-hatch-lilac border border-ink/10 flex items-center justify-center overflow-hidden">
            <svg className="w-20 h-20" viewBox="0 0 110 110" fill="none" aria-hidden="true" filter="url(#soft3DShadow)">
              <rect x="18" y="20" width="74" height="70" rx="18" fill="url(#clayViolet)" stroke="#7300FF" strokeWidth="2.2"/>
              <circle cx="55" cy="48" r="16" fill="url(#clayLilac)" stroke="#7300FF" strokeWidth="2"/>
              <path d="M48 48L53 53L63 43" stroke="#7300FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="31" y="70" width="48" height="10" rx="5" fill="#FFFFFF" stroke="#7300FF" strokeWidth="1.6"/>
            </svg>
          </div>
          <span className="text-xs font-extrabold text-ink mt-2 mb-0.5 tracking-tight">Sin Fricción</span>
        </button>

        {/* Sticker 5 — bottom right */}
        <button
          type="button"
          onClick={onSimulate}
          aria-label="Liquidación Directa"
          className="polaroid-card hidden lg:flex flex-col absolute proofly-satellite-five z-30 w-40 bg-white border border-ink/15 rounded-[22px] p-2.5 shadow-sticker hover:shadow-sticker-hover cursor-pointer"
          style={{ transform: 'rotate(-8deg)' }}
        >
          <div className="relative w-full h-28 rounded-[14px] bg-lilac-soft border border-electric/20 flex items-center justify-center overflow-hidden">
            <span className="absolute top-2 right-2 z-10 rounded-full border border-electric bg-white px-1.5 py-0.5 text-[9px] leading-tight font-extrabold text-electric whitespace-nowrap">+16,8 % E.A.</span>
            <svg className="w-22 h-22" viewBox="0 0 120 120" fill="none" aria-hidden="true" filter="url(#soft3DShadow)">
              <g transform="translate(0 9)">
              <polygon points="60,16 100,38 60,60 20,38" fill="#FFFFFF" stroke="#7300FF" strokeWidth="2.2" strokeLinejoin="round"/>
              <polygon points="20,38 60,60 60,104 20,82" fill="url(#clayLilac)" stroke="#7300FF" strokeWidth="2.2" strokeLinejoin="round"/>
              <polygon points="100,38 60,60 60,104 100,82" fill="url(#clayViolet)" stroke="#7300FF" strokeWidth="2.2" strokeLinejoin="round"/>
              </g>
            </svg>
          </div>
          <span className="text-xs font-extrabold text-ink mt-2 mb-0.5 tracking-tight">Liquidación Directa</span>
        </button>


        <div className="proofly-hero-copy relative z-20 mx-auto flex flex-col items-center text-center">
          <span className="text-electric text-[11px] font-extrabold uppercase tracking-[0.18em] mb-6">Tu trabajo, tu capital, a tiempo</span>
          <h1 className="font-extrabold text-ink tracking-[-0.06em] leading-[1.02] text-[44px] sm:text-[64px] lg:text-[76px]">
            Tu talento no<br />debería <span className="text-electric">esperar.</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-ink-soft max-w-[470px] leading-relaxed">
            Adelanta el cobro de tus hitos y facturas. O financia el trabajo de otros y recibe retornos en pesos.
          </p>
          <button type="button" onClick={onPublish} className="mt-8 bg-electric hover:bg-electric-dark text-white font-bold text-sm pl-7 pr-3 py-3 rounded-full inline-flex items-center gap-4 transition-colors">
            <span className="whitespace-nowrap">Adelantar mi primer hito</span>
            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0" aria-hidden="true">↗</span>
          </button>
          <button type="button" onClick={onSimulate} className="mt-4 text-sm font-semibold text-ink-soft hover:text-electric underline underline-offset-4 min-h-11">Quiero financiar talento</button>
        </div>
    </section>
  );
}
