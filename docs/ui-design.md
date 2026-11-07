# Mobile & Web UI Design — Proofly

The user experience in **Proofly** is a dedicated compact composition and modern fintech flow, built exclusively in **Light Mode (Modo Claro Absoluto)**. It prioritizes typographic contrast, clean white surfaces, soft lavender accents, and electric violet indicators.

---

## 1. Design Tokens and Palette

In accordance with [`docs/fuentes/DESIGN.md`](fuentes/DESIGN.md):

| Token | Hex | Usage in UI |
| :--- | :--- | :--- |
| **Canvas / Base** | `#FFFFFF` | Main background, elevated cards, and clean whitespace. |
| **Secondary Surface** | `#F8D4FD` | Soft pastel lavender for metric highlights, onboarding backgrounds, and Bento cards. |
| **Subtle Neutral** | `#F6F5F8` | Ultra-light lavender gray for card backgrounds, inputs, and segmented controls. |
| **Brand Primary Accent** | `#7300FF` | Electric violet for chart active bars, links, status badges, and progress meters. |
| **Strong Contrast / CTA** | `#000000` | Pure black for primary pill buttons (`border-radius: 9999px`), bold headings, and structural borders. |
| **Positive Return** | `#16A34A` | Emerald green for financier returns and positive cash flow (`+$500.000`). |
| **Discount / Outflow** | `#E11D48` | Ruby rose for commercial discount and cash outflow. |

---

## 2. Core Principles

| Principle | Proofly Implementation |
| :--- | :--- |
| **Modo Claro Absoluto** | No dark mode. Full consistency, high readability in direct sunlight, clean neobank aesthetic. |
| **Compact is a second design** | Dedicated mobile composition with floating glassmorphism dock (`backdrop-filter: blur(16px)`), pill tabs, and touch-friendly targets. |
| **One focal object and action** | Clear hierarchy: one main number gets to be big (Advance amount or Expected return) with a black pill CTA. |
| **Bento Grid for metrics** | 2-column rounded cards (`border-radius: 24px`): left card with vertical bars in `#7300FF`, right card in `#F8D4FD` with return summary. |
| **Real content and transparency** | Transparent breakdown of advance, nominal value, financing cost, net financier return in COP, and annualized rate (E.A.). |

---

## 3. Stageshow Alignment

Stageshow compact-design principles guide layout restraint, typography scale, and framing. Interfaces avoid faux operating system chrome or artificial latency; interactions provide immediate feedback in pesos (COP) with full cryptographic certainty behind the scenes.
