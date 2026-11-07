import React, { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion, splitChars } from '../lib/gsap';

interface FooterProps {
  onPublish: () => void;
}

export function Footer({ onPublish }: FooterProps) {
  const groundRef = useRef<HTMLDivElement>(null);
  const arrowRef   = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const ctaRef      = useRef<HTMLDivElement>(null);
  const ctaBtnRef   = useRef<HTMLButtonElement>(null);

  /* ── GSAP: title reveal (S11), wordmark paint reveal (S13), CTA hover (S12) ── */
  useEffect(() => {
    const cta = ctaRef.current;
    const wordmark = wordmarkRef.current;
    const btn = ctaBtnRef.current;
    if (!cta) return;

    const reduced = prefersReducedMotion();

    const ctx = gsap.context(() => {
      /* S11: title scroll-scrubbed reveal (opacity 0.2 → 1 per char). */
      const h2 = cta.querySelector('h2');
      if (h2) {
        const chars = splitChars(h2 as HTMLElement);
        gsap.set(chars, { opacity: reduced ? 1 : 0.2 });
        if (!reduced) {
          gsap.to(chars, {
            opacity: 1,
            ease: 'none',
            stagger: 0.5,
            scrollTrigger: { trigger: h2, start: 'top 85%', end: 'center center', scrub: true },
          });
        }
      }

      /* S13: the light-grey skeleton wordmark gets "painted" over with brand
         violet by a sharp brush front sweeping left→right. We animate --paint
         (0 → 1) on the colour layer itself; its mask uses that var, so this
         never touches the layer's own transform (owned by the parallax). */
      if (wordmark) {
        const stack = wordmark.parentElement as HTMLElement | null;
        if (reduced) {
          wordmark.style.setProperty('--paint', '1');
        } else {
          gsap.fromTo(
            wordmark,
            { '--paint': 0 } as gsap.TweenVars,
            {
              '--paint': 1,
              duration: 1.8,
              ease: 'power2.inOut',
              scrollTrigger: { trigger: stack ?? wordmark, start: 'top 85%' },
            } as gsap.TweenVars,
          );
        }
      }
    }, cta);

    /* S12: elastic scale hover on "Empezar Ahora" (JS, not CSS, for the spring). */
    let onEnter: (() => void) | undefined;
    let onLeave: (() => void) | undefined;
    if (btn && !reduced) {
      onEnter = () => gsap.to(btn, { scale: 1.06, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      onLeave = () => gsap.to(btn, { scale: 1, duration: 0.3, ease: 'power2.out' });
      btn.addEventListener('mouseenter', onEnter);
      btn.addEventListener('mouseleave', onLeave);
    }

    ScrollTrigger.refresh();
    return () => {
      ctx.revert();
      if (btn && onEnter) btn.removeEventListener('mouseenter', onEnter);
      if (btn && onLeave) btn.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // Keep the browser's exposed canvas and mobile chrome in the edge section's color.
  useEffect(() => {
    const ground = groundRef.current;
    if (!ground) return;
    const root = document.documentElement;
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousGround = root.style.getPropertyValue('--proofly-edge-ground');
    const previousTheme = theme?.content;
    const observer = new IntersectionObserver(([entry]) => {
      const color = entry.isIntersecting ? '#F6F5F8' : '#FFFFFF';
      root.style.setProperty('--proofly-edge-ground', color);
      if (theme) theme.content = color;
    });
    observer.observe(ground);
    return () => {
      observer.disconnect();
      if (previousGround) root.style.setProperty('--proofly-edge-ground', previousGround);
      else root.style.removeProperty('--proofly-edge-ground');
      if (theme && previousTheme !== undefined) theme.content = previousTheme;
    };
  }, []);

  /* ── Self-drawing arrow ── */
  useEffect(() => {
    const el = arrowRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) el.classList.add('arrow-drawn');
    }, { threshold: 0.35 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ── Wordmark parallax reveal ── */
  useEffect(() => {
    const el = wordmarkRef.current;
    if (!el) return;
    const handler = () => {
      const rect = el.getBoundingClientRect();
      const winH  = window.innerHeight;
      if (rect.top < winH + 120) {
        const vis    = Math.max(0, Math.min(1, (winH - rect.top + 80) / 320));
        const ySlide = 14 + (1 - vis) * 18;
        el.style.transform = `translate3d(0, ${ySlide.toFixed(1)}%, 0)`;
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <footer className="proofly-footer bg-white">

      {/* ── CTA top half ── */}
      <div className="bg-white px-6 sm:px-14 pt-16 sm:pt-24 pb-16 sm:pb-24 relative">
        <div ref={ctaRef} className="max-w-3xl mx-auto text-center flex flex-col items-center relative z-10">
          <span className="inline-block bg-[#F3F2F5] text-ink text-[11px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full">
            LISTO PARA COBRAR
          </span>

          <h2 className="balance-text font-extrabold text-4xl sm:text-6xl lg:text-[64px] tracking-tight text-ink leading-[1.05] mt-5">
            Haz que tu talento<br />trabaje por ti
          </h2>

          <div className="mt-9">
            <button
              ref={ctaBtnRef}
              type="button"
              onClick={onPublish}
              className="bg-lilac hover:bg-electric hover:text-white text-ink font-extrabold text-sm sm:text-base px-9 py-3.5 rounded-full border border-ink/15 shadow-card active:translate-y-0.5 transition-all"
            >
              Empezar Ahora
            </button>
          </div>
        </div>

        {/* Handwritten note + arrow */}
        <div ref={arrowRef} className="mt-10 lg:mt-0 lg:absolute lg:right-20 xl:right-32 lg:top-1/2 lg:-translate-y-1/4 flex flex-col items-center">
          <div className="font-hand text-2xl sm:text-[28px] font-bold text-ink -rotate-[18deg] leading-[1.05] text-center select-none">
            Empieza a adelantar<br />tus hitos hoy
          </div>
          <svg className="w-16 h-20 text-ink mt-1 -ml-4" viewBox="0 0 70 84" fill="none" aria-hidden="true">
            <path className="draw-arrow-path" d="M32 6 C48 28, 52 56, 16 66" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
            <path className="draw-arrow-head" d="M25 56 L14 66 L27 73" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* ── Brand bottom half ── */}
      <div ref={groundRef} className="proofly-footer-ground bg-surface pt-10 sm:pt-12 px-6 sm:px-14 overflow-hidden relative">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <p className="text-xs sm:text-sm text-ink font-medium leading-relaxed max-w-md">
            Liquidez por hitos y facturas simplificada para independientes modernos.<br />
            Adelanta tus cobros, recibe pesos en la cuenta que elijas.
          </p>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            <SocialLink href="#" label="Facebook">
              <path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V22h3.4z"/>
            </SocialLink>
            <SocialLink href="#" label="Instagram" stroke>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </SocialLink>
            <SocialLink href="#" label="TikTok">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </SocialLink>
            <SocialLink href="#" label="X (Twitter)">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </SocialLink>
            <SocialLink href="#" label="LinkedIn">
              <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z"/>
            </SocialLink>
          </div>
        </div>

        {/* Giant Proofly wordmark — light-grey skeleton painted over in brand violet */}
        <div className="wordmark-stack pt-6 sm:pt-10 -mx-6 sm:-mx-14 select-none pointer-events-none overflow-hidden flex justify-center" aria-hidden="true">
          {/* Skeleton base: always visible, light grey, distinct from the ground */}
          <div className="wordmark-skeleton font-script text-[25vw] sm:text-[22vw] leading-[0.72] tracking-tight whitespace-nowrap">
            Proofly
          </div>
          {/* Paint layer: brand violet, revealed left→right by the brush mask */}
          <div
            ref={wordmarkRef}
            className="footer-wordmark wordmark-paint font-script text-[25vw] sm:text-[22vw] text-ink leading-[0.72] tracking-tight whitespace-nowrap"
            style={{ transform: 'translateY(16%)' }}
          >
            Proofly
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Social icon helper ── */
function SocialLink({
  href, label, stroke = false, children,
}: {
  href: string; label: string; stroke?: boolean; children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="w-10 h-10 rounded-full bg-electric hover:bg-electric-dark text-white flex items-center justify-center transition-colors"
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill={stroke ? 'none' : 'currentColor'}
        stroke={stroke ? 'currentColor' : undefined}
        strokeWidth={stroke ? 2 : undefined}
        strokeLinecap={stroke ? 'round' : undefined}
        strokeLinejoin={stroke ? 'round' : undefined}
        aria-hidden="true"
      >
        {children}
      </svg>
    </a>
  );
}
