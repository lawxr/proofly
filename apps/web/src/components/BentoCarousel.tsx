import { useEffect, useRef, useCallback } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion, splitChars } from '../lib/gsap';

interface BentoCarouselProps {
  onFund: (idx: number) => void;
  onPublish: () => void;
  onSimulate: () => void;
}

export function BentoCarousel({ onFund, onSimulate }: BentoCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef     = useRef<HTMLDivElement>(null);
  const sectionRef   = useRef<HTMLElement>(null);
  const manualOffset = useRef(0);
  const springRef    = useRef<HTMLDivElement>(null);
  const barsActive   = useRef(false);

  /* ── GSAP: title reveal + staggered card/widget entrance (S1, S10) ──
     The horizontal pan (S9) is already handled by updateTrack below; we only
     add entrance choreography on the cards (children of the track) and the
     reputation width bar, which compose under the track's X transform. */
  useEffect(() => {
    const section = sectionRef.current;
    const track   = trackRef.current;
    if (!section || !track) return;

    const reduced = prefersReducedMotion();

    const ctx = gsap.context((self) => {
      const q = self.selector!;

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

      const cards = Array.from(track.children) as HTMLElement[];
      const repBar = q('[data-rep-bar]')[0] as HTMLElement | undefined;

      if (reduced) {
        gsap.set(cards, { opacity: 1, y: 0 });
        if (repBar) gsap.set(repBar, { width: '98%' });
        return;
      }

      // S10: staggered entrance — translateY(25px)→0, opacity 0→1.
      gsap.fromTo(
        cards,
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.12,
          scrollTrigger: { trigger: section, start: 'top 75%' },
        },
      );

      // S10: reputation progress bar fills from 0% to its final 98%.
      if (repBar) {
        gsap.fromTo(
          repBar,
          { width: '0%' },
          {
            width: '98%',
            duration: 1.1,
            ease: 'power2.out',
            scrollTrigger: { trigger: repBar, start: 'top 90%' },
          },
        );
      }
    }, section);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  /* ── Scroll-linked horizontal pan ── */
  const updateTrack = useCallback(() => {
    const track   = trackRef.current;
    const section = sectionRef.current;
    if (!track || !section) return;

    // Touch layouts use native horizontal scrolling, never vertical-scroll translation.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      track.style.removeProperty('transform');
      return;
    }
    const rect  = section.getBoundingClientRect();
    const winH  = window.innerHeight;
    if (rect.top < winH && rect.bottom > 0) {
      const ratio    = Math.max(0, Math.min(1, (winH - rect.top) / (winH + rect.height)));
      const maxShift = Math.min(420, Math.max(160, track.scrollWidth - window.innerWidth + 120));
      const xShift   = -(ratio * maxShift) + manualOffset.current;
      track.style.transform = `translate3d(${xShift.toFixed(1)}px, 0, 0)`;
    }
  }, []);

  function nudge(deltaPx: number) {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      viewportRef.current?.scrollBy({
        left: Math.sign(deltaPx) * (trackRef.current?.firstElementChild?.getBoundingClientRect().width ?? 320),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
      return;
    }
    manualOffset.current = Math.max(-520, Math.min(120, manualOffset.current - deltaPx));
    updateTrack();
  }

  /* ── Spring bars IntersectionObserver ── */
  useEffect(() => {
    const el = springRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !barsActive.current) {
        barsActive.current = true;
        el.classList.add('bars-active');
      }
    }, { threshold: 0.25 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* ── Scroll listener + drag ── */
  useEffect(() => {
    const onScroll = () => requestAnimationFrame(updateTrack);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    const track = trackRef.current;
    if (!track) return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };

    let isDown = false;
    let startX = 0;

    const onDown  = (e: PointerEvent) => {
      if (window.matchMedia('(max-width: 1023px)').matches || (e.target as Element).closest('button')) return;
      isDown = true; startX = e.clientX;
    };
    const onMove  = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      startX = e.clientX;
      manualOffset.current = Math.max(-560, Math.min(160, manualOffset.current + dx));
      updateTrack();
    };
    const onUp    = () => { isDown = false; };

    track.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    updateTrack();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      track.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [updateTrack]);

  return (
    <section ref={sectionRef} id="ecosistema" className="proofly-ecosystem space-y-10 overflow-hidden">
      {/* Header */}
      <div className="proofly-ecosystem-heading grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        <div className="lg:col-span-2">
          <span className="inline-flex items-center gap-2 text-xs font-extrabold tracking-widest text-electric bg-lilac/50 border border-ink/15 px-3 py-1 rounded-full tabular-nums">01-06</span>
        </div>
        <div className="lg:col-span-6">
          <h2 className="balance-text font-extrabold text-4xl sm:text-6xl tracking-tight text-ink leading-[1.03]">
            Todo en un<br /><span className="text-electric">solo lugar.</span>
          </h2>
        </div>
        <div className="lg:col-span-4 flex items-center justify-between lg:justify-end gap-3">
          <span className="text-xs font-bold text-zinc-500">Desliza o haz scroll</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => nudge(-320)} aria-label="Desplazar a la izquierda" className="w-10 h-10 rounded-full bg-white border border-ink/12 shadow-card hover:bg-lilac flex items-center justify-center font-extrabold text-sm transition-colors">←</button>
            <button type="button" onClick={() => nudge(320)}  aria-label="Desplazar a la derecha"  className="w-10 h-10 rounded-full bg-white border border-ink/12 shadow-card hover:bg-lilac flex items-center justify-center font-extrabold text-sm transition-colors">→</button>
          </div>
        </div>
      </div>

      {/* Horizontal track */}
      <div ref={viewportRef} className="proofly-bento-viewport relative py-4" tabIndex={0} role="region" aria-label="Funciones de Proofly, desliza para explorar">
        <div ref={trackRef} className="bento-track flex items-center gap-8 w-max select-none">

          {/* ── Card group 1: Freelancer photo + QR widget + cash card ── */}
          <div className="w-[360px] sm:w-[410px] shrink-0 relative flex flex-col">
            <div className="w-[76%] rounded-[30px] border border-ink/15 bg-white p-2 shadow-card">
              <div className="editorial-photo-wrap rounded-[22px] aspect-[4/4.6]">
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=80"
                  alt="Diseñador independiente validando su entregable"
                  width="700" height="800" loading="lazy" decoding="async"
                  className="editorial-photo w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="bg-white border border-ink/15 rounded-[24px] p-4 shadow-floating w-[85%] -mt-28 ml-auto relative z-20 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-lilac border border-ink/12 flex items-center justify-center shrink-0">
                <svg className="w-10 h-10 text-ink" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="2.5"/>
                  <rect x="6.5" y="6.5" width="4" height="4" rx="1" fill="#7300FF"/>
                  <rect x="22" y="3" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="2.5"/>
                  <rect x="25.5" y="6.5" width="4" height="4" rx="1" fill="currentColor"/>
                  <rect x="3" y="22" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="2.5"/>
                  <rect x="6.5" y="25.5" width="4" height="4" rx="1" fill="currentColor"/>
                  <rect x="22" y="22" width="5" height="5" rx="1" fill="#7300FF"/>
                  <rect x="29" y="22" width="4" height="11" rx="1" fill="currentColor"/>
                  <rect x="22" y="29" width="5" height="4" rx="1" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <div className="font-extrabold text-sm text-ink">Acepta hitos con QR</div>
                <p className="text-xs text-zinc-600 leading-snug mt-0.5">Cobra en segundos.<br />Escanea para validar.</p>
              </div>
            </div>

            <div className="w-44 h-40 rounded-[26px] bg-gradient-to-br from-lilac via-[#EFE5FF] to-white border border-ink/15 p-3 shadow-card ml-auto -mt-4 relative z-10 flex flex-col items-center justify-center">
              <svg className="w-24 h-24" viewBox="0 0 110 110" fill="none" aria-hidden="true" filter="url(#soft3DShadow)">
                <rect x="16" y="38" width="66" height="38" rx="10" transform="rotate(-14 16 38)" fill="url(#clayViolet)" stroke="#1E0B3B" strokeWidth="2.2"/>
                <rect x="26" y="46" width="66" height="38" rx="10" transform="rotate(8 26 46)" fill="url(#clayLilac)" stroke="#1E0B3B" strokeWidth="2.2"/>
                <circle cx="56" cy="69" r="11" fill="#7300FF" stroke="#1E0B3B" strokeWidth="1.8"/>
                <text x="56" y="69" textAnchor="middle" dominantBaseline="central" fill="#FFF" fontSize="12" fontWeight="800">$</text>
              </svg>
              <span className="text-[11px] font-extrabold text-ink">Efectivo al instante</span>
            </div>
          </div>

          {/* ── Card group 2: 3D medallions + pagos recientes ── */}
          <div className="w-[380px] sm:w-[430px] shrink-0 relative flex flex-col items-center">
            <div className="w-[88%] mr-auto rounded-[34px] bg-gradient-to-b from-[#EFE5FF] via-lilac/65 to-[#FFF8FE] border border-ink/15 p-6 pb-20 flex items-center justify-center relative overflow-hidden min-h-[390px] shadow-card">
              <svg className="w-64 h-64" viewBox="0 0 240 240" fill="none" aria-hidden="true" filter="url(#soft3DShadow)">
                <g transform="translate(88,10) rotate(12)">
                  <ellipse cx="52" cy="54" rx="46" ry="44" fill="#D586E8"/>
                  <ellipse cx="48" cy="48" rx="46" ry="44" fill="url(#clayLilac)" stroke="#1E0B3B" strokeWidth="2.2"/>
                  <circle cx="35" cy="38" r="4.5" fill="#7300FF"/>
                  <circle cx="61" cy="38" r="4.5" fill="#7300FF"/>
                  <path d="M33 54 C39 64, 57 64, 63 54" stroke="#7300FF" strokeWidth="4" strokeLinecap="round"/>
                </g>
                <g transform="translate(8,72) rotate(-14)">
                  <ellipse cx="54" cy="56" rx="48" ry="45" fill="#4B00A8"/>
                  <ellipse cx="50" cy="50" rx="48" ry="45" fill="url(#clayViolet)" stroke="#1E0B3B" strokeWidth="2.2"/>
                  <ellipse cx="36" cy="32" rx="18" ry="8" transform="rotate(-25 36 32)" fill="#FFFFFF" fillOpacity="0.45"/>
                  <text x="50" y="61" textAnchor="middle" fill="#FFFFFF" fontSize="32" fontWeight="800" fontFamily="Plus Jakarta Sans">$</text>
                </g>
                <g transform="translate(80,122) rotate(8)">
                  <ellipse cx="48" cy="50" rx="44" ry="42" fill="#B689FF"/>
                  <ellipse cx="44" cy="44" rx="44" ry="42" fill="url(#clayLavender)" stroke="#1E0B3B" strokeWidth="2.2"/>
                  <path d="M30 44L40 54L59 34" stroke="#7300FF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
              </svg>
            </div>

            <div className="bg-white border border-ink/15 rounded-[26px] p-5 shadow-floating w-[92%] -mt-20 ml-auto relative z-20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-ink">Pagos recientes</h3>
                  <p className="text-xs text-zinc-500">Monitorea cada operación</p>
                </div>
                <span className="text-sm font-black text-ink" aria-hidden="true">↗</span>
              </div>
              <div className="space-y-2 pt-1">
                <button type="button" onClick={() => onFund(0)} className="w-full p-3 rounded-2xl bg-lilac-soft hover:bg-lilac/55 border border-ink/10 transition-colors flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-electric text-white font-extrabold text-xs flex items-center justify-center border border-ink/15">B</span>
                    <div>
                      <div className="text-xs font-extrabold text-ink">Sprint Backend · Bancolombia</div>
                      <div className="text-[10px] text-zinc-500">Hito verificado · COP</div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-ink tabular-nums">$ 12.400.000</span>
                </button>
                <button type="button" onClick={() => onFund(1)} className="w-full p-3 rounded-2xl bg-lilac-soft hover:bg-lilac/55 border border-ink/10 transition-colors flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-lilac border border-ink/15 text-ink font-extrabold text-xs flex items-center justify-center">M</span>
                    <div>
                      <div className="text-xs font-extrabold text-ink">Sistema UI · Mercado Libre</div>
                      <div className="text-[10px] text-zinc-500">Factura electrónica · COP</div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-ink tabular-nums">$ 6.850.000</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Card group 3: photo + spring bar chart ── */}
          <div ref={springRef} className="w-[380px] sm:w-[440px] shrink-0 relative flex flex-col">
            <div className="w-[74%] mr-auto mt-16 rounded-[30px] border border-ink/15 bg-white p-2 shadow-card">
              <div className="editorial-photo-wrap rounded-[22px] aspect-[4/3.8]">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&q=80"
                  alt="Equipo revisando retornos de portafolio"
                  width="700" height="665" loading="lazy" decoding="async"
                  className="editorial-photo w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="bg-white border border-ink/15 rounded-[28px] p-6 shadow-floating w-[86%] -mt-64 ml-auto relative z-20 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-zinc-600">Resumen de recaudos</span>
                <button type="button" onClick={onSimulate} className="text-xs font-extrabold text-electric hover:underline">Ver todo</button>
              </div>
              <div>
                <div className="font-extrabold text-3xl sm:text-4xl text-ink tracking-tight tabular-nums">$ 48.250.000</div>
                <div className="inline-flex items-center gap-1.5 mt-1 text-xs font-extrabold text-emerald-600 tabular-nums">
                  <span>+8% este mes</span>
                  <span className="text-zinc-400 font-medium">· 16,8% E.A.</span>
                </div>
              </div>
              <div className="pt-2 flex items-end justify-between gap-2.5 h-28 px-1" aria-label="Gráfico animado de recaudos">
                {[
                  { h: 'h-14', bg: 'bg-lilac',          delay: '40ms' },
                  { h: 'h-24', bg: 'bg-electric',        delay: '110ms' },
                  { h: 'h-16', bg: 'bg-lilac-lavender',  delay: '180ms' },
                  { h: 'h-20', bg: 'bg-lilac',           delay: '250ms' },
                  { h: 'h-12', bg: 'bg-surface',         delay: '320ms' },
                  { h: 'h-28', bg: 'bg-electric',        delay: '390ms' },
                  { h: 'h-20', bg: 'bg-lilac-deep',      delay: '460ms' },
                ].map((bar, i) => (
                  <div
                    key={i}
                    className={`spring-bar w-full ${bar.h} rounded-full ${bar.bg} border border-ink/12`}
                    style={{ transitionDelay: bar.delay }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Card group 4: dual reputation card ── */}
          <div className="w-[330px] sm:w-[360px] shrink-0 bg-gradient-to-br from-lilac-soft via-lilac/45 to-[#EFE5FF] border border-ink/15 rounded-[32px] p-7 shadow-floating space-y-5">
            <div className="inline-flex items-center gap-2 bg-white border border-ink/15 rounded-full px-3 py-1 text-[11px] font-extrabold text-electric">
              <span>★ REPUTACIÓN DUAL</span>
            </div>
            <h3 className="font-extrabold text-2xl text-ink leading-tight">Cualquier freelancer puede construir su cupo.</h3>
            <p className="text-xs text-zinc-700 leading-relaxed font-medium">
              Combinamos tu cumplimiento en entregas con la puntualidad de pago de la empresa contratante para darte liquidez desde tu primer proyecto.
            </p>
            <div className="bg-white border border-ink/12 rounded-2xl p-4 space-y-2.5">
              <div className="flex justify-between text-xs font-extrabold">
                <span>Puntaje Freelancer (Entrega)</span>
                <span className="text-electric tabular-nums">98 / 100</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-surface border border-ink/20 overflow-hidden">
                <div data-rep-bar className="h-full w-[98%] bg-electric rounded-full" />
              </div>
              <div className="flex justify-between text-xs font-extrabold pt-1">
                <span>Puntaje Empresa (Pago)</span>
                <span className="text-emerald-600 tabular-nums">AAA · Verificada</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
