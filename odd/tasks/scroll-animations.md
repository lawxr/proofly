# Scroll & Loop Animations (GSAP + ScrollTrigger)

Objective: add scroll-scrubbed and continuous-loop animations to the Proofly landing (apps/web), respecting existing structure/styles.
Branch: feat/scroll-animations
Delivery: single-pr (small feature, one deliverable)
Runner: `npm run build` (vite tsc) in apps/web — no test runner configured for web app.

## Specs

- S1 Global title scroll-scrubbed reveal: split these h1/h2 titles into chars/words and reveal progressively tied to scroll (scrub), each glyph starting at opacity 0.2 → 1 sequentially as the title enters the center of the viewport. Titles: "Tu talento no debería esperar." (Hero), "Cobra hoy sin esperar a 60 días." (ValueProposition), "Todo en un solo lugar." (BentoCarousel), "Haz que tu talento trabaje por ti" (Footer).
- S2 Hero 5 satellite cards entrance: scale 0.8→1, opacity 0→1, spring physics on page load, PRESERVING each card's inline rotate(Ndeg): -9, 11, -11, -14, -8.
- S3 Hero satellites idle loop: infinite Y float translateY -8px..8px, duration 3-4s, ease sine.inOut, staggered delays so they don't move in sync.
- S4 Hero satellites scroll parallax: on scroll down, move cards slightly on Y at different speeds.
- S5 Hero primary CTA marquee: infinite horizontal right→left marquee of "Adelantar mi primer hito" text inside the pill button, keeping ↗ icon fixed at right.
- S6 ValueProposition main right container (Sofía Vargas card): scroll-linked expansion via clip-path inset / vertical scale, from horizontally-cropped to full height as the section enters.
- S7 ValueProposition "Desembolso hoy $ 8.347.000" overlay card: elastic pop-in (scale 0→1 keeping its -6deg rotation) when the main container reaches 70% of its expansion.
- S8 ValueProposition handwritten note arrow: animate hand-drawn SVG arrow via stroke-dasharray/stroke-dashoffset (draw on scroll) + fade-in of the handwritten text.
- S9 BentoCarousel horizontal track: connect card row to vertical page scroll so the whole row pans right→left (translateX) scrubbed as user scrolls the section. (Coordinate with existing updateTrack JS.)
- S10 BentoCarousel inner cards/widgets: staggered entrance translateY(25px)→0, opacity 0→1 on viewport enter; animate progress bars/indicators fill/height from 0% to final.
- S11 Footer CTA title "Haz que tu talento trabaje por ti": letter-by-letter reveal on scroll (same as S1).
- S12 Footer side arrow SVG: stroke-dashoffset draw on enter; "Empezar Ahora" button gets elastic scale hover.
- S13 Footer giant cursive "Proofly" wordmark (PLAIN TEXT, not svg): live handwriting/painting reveal on viewport enter — wrap in an animated SVG mask / clip-path organic sweep following the cursive slant, duration ~1.8s ease power2.inOut, left→right.

Constraints:
- Respect prefers-reduced-motion: guard all GSAP with gsap.matchMedia; reduced users jump to end state.
- Preserve existing inline transforms (satellite rotate, .proofly-payout rotate, footer wordmark translateY) and existing JS scroll handlers (BentoCarousel updateTrack, Footer parallax) — coordinate, don't double-drive.
- Desktop-only satellites (hidden lg:flex): guard with matchMedia min-width 1024.

## Tasks

- T1 [S-all] Install gsap@3.15.1, add src/lib/gsap.ts (register ScrollTrigger, splitChars, reduced-motion/desktop helpers). route: inline. status: done.
- T2 [S1,S2,S3,S4,S5] Hero animations. route: inline. status: done.
- T3 [S6,S7,S8] ValueProposition animations. route: inline. status: done.
- T4 [S9,S10] BentoCarousel animations (S9 kept via existing updateTrack; added S1 title + S10 card stagger + rep-bar fill). route: inline. status: done.
- T5 [S11,S12,S13] Footer animations incl. wordmark paint reveal + CTA elastic hover. route: inline. status: done.
- T6 Build verification. route: inline. status: done.

## Log

- L1 (original request, verbatim summary): implement fluid scroll-based animations + continuous loops using GSAP+ScrollTrigger or Framer Motion, respecting existing structure/styles, with 6 numbered behavior groups (global titles, hero, second section, third section, final CTA, footer wordmark paint).
- L2: Chose GSAP + ScrollTrigger over Framer Motion — codebase already uses imperative refs + IntersectionObserver + CSS; GSAP composes with existing inline transforms and gives true scrub/pin/parallax. GSAP 3.13+ ships ScrollTrigger free in public npm package.
- L3 (verification): `npm run build` (vite) → built in 508ms, exit 0, JS 303.67kB (GSAP+ScrollTrigger bundled). `npx tsc --noEmit` → exit 0, no type errors. Dev server (vite) served / (200) and all edited modules transformed (200): lib/gsap.ts, Hero, ValueProposition, BentoCarousel, Footer. No test runner configured for the web app, so verification is build + typecheck + dev transform.
- L4 (design notes): S9 was already satisfied by the pre-existing updateTrack scroll-linked translateX in BentoCarousel; added GSAP would double-drive the track transform, so kept it and only added S1/S10 on children (compose under track X). S12 arrow draw was already wired via .draw-arrow-* CSS + IntersectionObserver; only added the elastic hover. Satellite rotate(Ndeg), .proofly-payout rotate(-6deg), and footer wordmark translateY parallax preserved (wordmark animated via mask-image CSS var, never its transform). All GSAP guarded by gsap.context (StrictMode-safe revert) + prefersReducedMotion + desktop matchMedia for satellites.
- Risk: none (additive animations in apps/web only; no data, auth, contracts, concurrency, or delivery touched; no existing behavior changed — only decorative motion added, existing CSS animation systems left intact).
- L5 (S13 refinement, user request): replaced the soft slanted-gradient wordmark reveal with (a) a light-grey skeleton layer (#DAD7E0 + grey text-stroke) always visible and distinct from the #F6F5F8 ground, and (b) a brand-violet colour layer painted over it with a SHARP brush front (narrow hard mask edge via --edge) plus a repeating bristle-streak mask composited in, so it reads as a loaded brush filling the word left→right rather than a gradient that "dots" it. Two stacked copies in Footer.tsx; GSAP now drives --paint on the colour layer itself (not the parent). Build + tsc + dev transform verified. Risk: none (footer-only presentational change).
- L6 (S13 simplification, user feedback): removed the bristle-streak repeating mask and mask-composite (over-engineered, unwanted). Reveal is now a single sharp brush-front linear-gradient mask. Fixed ~10px miscentering: both layers now share one CSS-grid cell (grid-area 1/1, justify-items center) instead of mixing flex-centered skeleton with absolute margin-auto colour layer; removed Tailwind `flex justify-center` from the stack container so .wordmark-stack display:grid applies. Build + tsc verified. Risk: none.
- L7 (S13 reverted, user feedback "option A"): removed the wordmark paint reveal entirely — restored the original single-layer violet wordmark markup, dropped the GSAP --paint tween (S13) from the Footer effect, and removed the @property/.wordmark-* CSS block (preserved the unrelated .proofly-pin-grid rules that followed it). KEPT the other footer animations: S11 title scrub reveal and S12 elastic button hover; the pre-existing .footer-wordmark parallax is untouched. S13 is now unimplemented by design. Build + tsc verified. Risk: none.
