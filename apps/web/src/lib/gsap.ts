/**
 * Shared GSAP + ScrollTrigger setup and animation helpers.
 *
 * GSAP 3.13+ ships ScrollTrigger in the public package. We register it once
 * here so every component imports the same configured instance.
 *
 * All helpers are breakpoint- and reduced-motion-aware. Components call them
 * from inside a gsap.context() in a useEffect and return ctx.revert() so React
 * StrictMode's double-mount in dev cleans up every tween and ScrollTrigger.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/** True when the user asked the OS to reduce motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Desktop breakpoint matching Tailwind's `lg` (satellites are `hidden lg:flex`). */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Split a text node's content into per-character <span> wrappers so each glyph
 * can be animated independently. Preserves spaces (non-breaking) and leaves
 * existing child elements (e.g. <br>, nested <span>) in place by recursing
 * only over direct text nodes.
 *
 * Returns the created character spans in document order. Idempotent: if the
 * element was already split (data-split="true") it returns the existing spans.
 */
export function splitChars(el: HTMLElement): HTMLElement[] {
  if (el.dataset.split === 'true') {
    return Array.from(el.querySelectorAll<HTMLElement>('[data-char]'));
  }

  const chars: HTMLElement[] = [];

  const wrapTextNode = (node: Text) => {
    const text = node.textContent ?? '';
    const frag = document.createDocumentFragment();
    for (const ch of text) {
      if (ch === ' ') {
        frag.appendChild(document.createTextNode('\u00A0'));
        continue;
      }
      const span = document.createElement('span');
      span.dataset.char = '';
      span.style.display = 'inline-block';
      span.style.willChange = 'opacity';
      span.textContent = ch;
      chars.push(span);
      frag.appendChild(span);
    }
    node.replaceWith(frag);
  };

  // Snapshot child nodes first; we mutate the tree as we go.
  const walk = (parent: Node) => {
    const children = Array.from(parent.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) {
        wrapTextNode(child as Text);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = (child as Element).tagName.toLowerCase();
        if (tag !== 'br') walk(child);
      }
    }
  };

  walk(el);
  el.dataset.split = 'true';
  return chars;
}
