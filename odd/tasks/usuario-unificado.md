# Usuario unificado (una persona financia e invierte)

- Objetivo: unificar freelancer + financiador en un solo usuario con identidad única; el toggle pasa de "cambiar identidad" a "intención" (Financiarme / Invertir). Quitar todo lenguaje "demo/sandbox/simulado" de la UI visible. Mantener saldos separados por debajo (cupo de adelanto vs capital invertido). Incorporar ilustraciones nuevas.
- Rama: trabajo local (sin branch nueva salvo que el usuario lo pida).
- Runner: `npm run test:browser`, `npm run check`, tests de dominio/servidor existentes.

## Specs

- S1: Un solo usuario ("Valentina Ríos", avatar "VR") que es dueño de sus operaciones Y puede invertir en las del mercado. El snapshot deja de exponer `freelancer`/`investor` como dos personas; expone `me` con ambos saldos. El mercado lo siguen alimentando freelancers semilla distintos, para que exista en qué invertir.
- S2: El toggle superior deja de cambiar identidad. Es intención: "Financiarme" | "Invertir". Solo cambia qué muestra Home; el usuario (header/avatar) es siempre el mismo.
- S3: Los dos saldos se muestran como tarjetas distintas y claramente etiquetadas ("Cupo disponible" para financiarme, "Capital invertido" para invertir), nunca sumados en un solo número.
- S4: Regla de negocio nueva en el adaptador: un usuario no puede invertir en su propia operación (no aparece en su mercado y la acción se rechaza).
- S5: Quitar de la UI visible todo texto "demo", "sandbox", "simulado", "privada", "no es dinero real", "se restablece al reiniciar", etiquetas de "Demo privada", notas de validaciones simuladas, etc. La app debe leerse como producción. El backend sigue en memoria sin servicios reales; esto no se afirma en la UI pero tampoco se niega con lenguaje falso de "real".
- S6: Incorporar `/assets/proofly/ilustracion-tiempo.png` (lado Financiarme) y `/assets/proofly/ilustracion-crecer.png` (lado Invertir), manteniendo paleta violeta y modo claro.

## Tasks

- T1 (S1,S4): Backend adaptador `scripts/private-app.mjs` — usuario unificado + snapshot `me` + regla self-invest. Route: inline.
- T2 (S2,S3,S5,S6): UI `DemoApp.tsx` — toggle intención, saldos separados, limpieza de lenguaje, ilustraciones. Route: inline.
- T3 (S5): Limpieza de lenguaje en `DemoLogin.tsx`, `index.html` y textos de carga/fallback. Route: inline.
- T4: CSS — ajustes para ilustraciones y header unificado. Route: inline.
- T5: Verificar (check + browser test + server/domain tests).

## Log

- L1: "unificar el usuario en uno solo que tanto inversores puedan financiarse y freelancers puedan invertir, estetica bonita y simplificada". Opción elegida: A (identidad unificada + saldos separados). Nuevo requisito L1b: NO mostrar que es demo en ningún lado; debe leerse como producción aunque el uso real sea privado.
- L2: PNG movidos a `apps/web/public/assets/proofly/` como `ilustracion-tiempo.png` (financiarme) e `ilustracion-crecer.png` (invertir).
- L3: Dominio verificado: no exige rol FREELANCER/INVESTOR, solo KYC. Un usuario unificado es viable sin tocar `packages/domain`. Regla "no invertir en lo propio" vive en el adaptador.
- L4: Adaptador necesitó una contraparte de mercado interna (`counterparty`, usando investor del seed, NO visible en snapshot) para fondear las operaciones propias del usuario, ya que una sola persona no puede autofinanciarse. Usuario `me` promovido a TIER_3_PRO para permitir varias operaciones activas.
- L5: Verificación — todo en verde:
  - `npx tsc --noEmit` (apps/web): OK.
  - `vite build`: OK, ilustraciones copiadas a dist.
  - `tests/demo-server.test.mjs tests/private-app.test.mjs`: 10/10.
  - dominio + api: 21/21.
  - `npm run test:browser`: PASS (identidad única, sin lenguaje demo, dos saldos, toggle intención, no auto-inversión, responsive 320-768 + desktop).
- Riesgo: cambié el contrato del snapshot (`freelancer`/`investor` → `me`) que consume la UI, y la regla de negocio de participación. Cubierto por tests reescritos del adaptador y el browser test. Riesgo: item 3 (contrato interno que la UI consume), mitigado y verificado.
