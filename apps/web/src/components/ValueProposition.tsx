import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion, splitChars } from '../lib/gsap';

interface ValuePropositionProps {
  onPublish: () => void;
}

export function ValueProposition({ onPublish }: ValuePropositionProps) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = prefersReducedMotion();

    const ctx = gsap.context((self) => {
      const q = self.selector!;

      /* ── S1: Title scroll-scrubbed reveal (opacity 0.2 → 1 per char) ── */
      const h2 = q('h2')[0] as HTMLElement | undefined;
      if (h2) {
        const chars = splitChars(h2);
        gsap.set(chars, { opacity: reduced ? 1 : 0.2 });
        if (!reduced) {
          gsap.to(chars, {
            opacity: 1,
            ease: 'none',
            stagger: 0.5,
            scrollTrigger: { trigger: h2, start: 'top 80%', end: 'center center', scrub: true },
          });
        }
      }

      const card = q('[data-vp-card]')[0] as HTMLElement | undefined;
      const payout = q('.proofly-payout')[0] as HTMLElement | undefined;
      const note = q('[data-vp-note]')[0] as HTMLElement | undefined;
      const arrow = q('[data-vp-arrow]')[0] as SVGPathElement | undefined;

      if (reduced) {
        // Jump straight to the resting state.
        if (card) gsap.set(card, { clearProps: 'all' });
        if (payout) gsap.set(payout, { scale: 1, rotate: -6, opacity: 1 });
        if (note) gsap.set(note, { opacity: 1 });
        if (arrow) {
          const len = arrow.getTotalLength();
          gsap.set(arrow, { strokeDasharray: len, strokeDashoffset: 0 });
        }
        return;
      }

      /* ── S6: main card scroll-linked expansion (clip-path inset top/bottom) ── */
      if (card) {
        gsap.fromTo(
          card,
          { clipPath: 'inset(45% 0% 45% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            ease: 'none',
            scrollTrigger: { trigger: card, start: 'top 85%', end: 'top 35%', scrub: true },
          },
        );
      }

      /* ── S7: payout overlay elastic pop-in at 70% of the card's expansion ── */
      if (payout) {
        gsap.set(payout, { scale: 0, rotate: -6, transformOrigin: 'center center' });
        ScrollTrigger.create({
          trigger: card ?? payout,
          start: 'top 85%',
          end: 'top 35%',
          onUpdate: (st) => {
            if (st.progress >= 0.7 && !payout.dataset.popped) {
              payout.dataset.popped = 'true';
              gsap.to(payout, { scale: 1, rotate: -6, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
            }
          },
        });
      }

      /* ── S8: hand-drawn arrow self-draw + handwritten note fade-in ── */
      if (arrow) {
        const len = arrow.getTotalLength();
        gsap.set(arrow, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(arrow, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: { trigger: arrow, start: 'top 90%', end: 'top 55%', scrub: true },
        });
      }
      if (note) {
        gsap.fromTo(
          note,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: { trigger: note, start: 'top 88%' },
          },
        );
      }
    }, root);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <section id="ventajas" className="proofly-value relative overflow-hidden bg-lilac text-ink" ref={rootRef}>
      <svg className="absolute -bottom-24 -left-20 w-80 h-80 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0L15 7L22 4L17 10L24 12L17 14L22 20L15 17L12 24L9 17L2 20L7 14L0 12L7 10L2 4L9 7Z" />
      </svg>
      <div className="relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <h2 className="font-extrabold text-[36px] sm:text-[46px] lg:text-[48px] leading-[1.05] tracking-[-0.05em] max-w-lg">
            Cobra hoy sin<br />esperar a 60 días.
          </h2>
          <p className="mt-6 text-base sm:text-lg leading-relaxed text-ink-soft max-w-[440px]">
            Sube tu factura o los hitos de tu proyecto confirmado. Evaluamos tu historial de entrega y el cumplimiento de la empresa para adelantar tu dinero, mientras quienes financian reciben su capital más rendimiento cuando la empresa paga.
          </p>
          <button type="button" onClick={onPublish} className="mt-7 bg-electric hover:bg-electric-dark text-white font-bold text-sm px-7 py-4 rounded-full transition-colors">
            Adelantar mi primer hito
          </button>
          <div className="mt-8 flex items-center gap-4" aria-hidden="true">
            <p data-vp-note className="font-hand text-[28px] sm:text-[32px] font-bold leading-tight -rotate-3">
              Tu trabajo vale hoy,<br /><span className="text-electric">no en dos meses</span>
            </p>
            <svg className="w-12 h-12 text-ink" viewBox="0 0 64 64" fill="none">
              <path data-vp-arrow d="M8 51C32 55 43 37 48 15M39 22L49 12L54 25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="proofly-value-visual relative pt-3 pb-16 lg:pb-8" aria-label="Ejemplo ilustrativo de adelanto de un hito">
          <div data-vp-card className="bg-white rounded-[28px] p-5 sm:p-7 shadow-card border border-electric/5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-electric text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">SV</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">Sofía Vargas<span className="hidden sm:inline"> · Diseñadora</span></div>
                <div className="text-xs text-ink-soft mt-1">Hito de diseño confirmado</div>
              </div>
              <span className="bg-lilac/60 text-ink text-[11px] font-bold rounded-full px-3 py-1 shrink-0">30 días</span>
            </div>
            <div className="mt-6 rounded-[20px] bg-surface p-5 flex flex-wrap justify-between items-end gap-4">
              <div><div className="text-xs text-ink-soft mb-2">Valor del entregable</div><div className="text-[28px] sm:text-[32px] leading-none font-extrabold tracking-tight tabular-nums">$ 8.500.000</div></div>
              <div><div className="text-[11px] text-ink-soft mb-2">Retorno financiador</div><div className="text-electric text-lg font-extrabold">16,8 % E.A.</div></div>
            </div>
            <div className="mt-6 flex justify-between gap-4 text-xs"><span className="text-ink-soft">Adelanto disponible hoy</span><span className="font-bold tabular-nums">$ 8.347.000</span></div>
            <div className="mt-2 h-2 rounded-full bg-electric" />
            <div className="mt-4 text-[10px] text-ink-soft">Ejemplo ilustrativo. Valores sujetos a evaluación.</div>
          </div>
          <div className="proofly-payout relative mt-4 ml-3 sm:-ml-4 bg-white border border-electric/20 rounded-[20px] p-2.5 shadow-floating w-[185px]">
            <div className="bg-electric rounded-[12px] text-white text-center px-4 py-5">
              <div className="text-[11px] font-semibold text-white/85">Desembolso hoy</div>
              <div className="mt-1 text-lg font-extrabold tabular-nums">$ 8.347.000</div>
            </div>
            <div className="text-[11px] text-center font-bold pt-2 pb-1">A tu cuenta, en pesos ↗</div>
          </div>
        </div>
      </div>
    </section>
  );
}
