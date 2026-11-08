# Private demo PIN
Objective: use the landing as the public entry, then a server-validated PIN gate before the existing mobile-first demo.
Branch: feat/private-demo-pin. Route: inline implementation with independent security verification (Risk: item 2). Tests: node --test tests/demo-server.test.mjs; npm test; web typecheck/build. Existing dirty work must not be committed or overwritten.

## Specs
- S1: "la cajita de liquidacion directa esta muy grande" — reduce only that floating card; preserve the full-bleed composition.
- S2: "seria mejor un pin ya que vamos a hacer la demo privada y ahi nos llevara a nuestra app web mobile firts" — Empezar leads to a mobile-first PIN screen, then the existing web demo. The server must enforce access; no browser-only password or false authentication. The landing is the public default entry, as requested in the preceding turn.
- S3: "pin de 4 digitos asi con las 4 casillas grandotas" — exactly four numeric digits, four large individually accessible inputs, keyboard and paste support.
- S4: "luego de eso es nuestra app completa que construimos basandonos en [Image #1]" — functional mobile-first violet app, not a mocked phone preview or the legacy blue UI.
- S5: "pon que este sea el proyecto principal la pagina azul que habiamos diseñado en el root no la vamos a usar a no ser que tenga logica correcta con nuestra docuemntacion" — /app/ uses the new React app; reuse only validated domain logic, not the blue interface. Preserve existing demo data.
- Assumptions: one shared configurable PIN for a private demonstration, not individual production accounts; an eight-hour session; local generated PIN stored only in an ignored configuration file. No publishing or deployment is authorized.

## Tasks
- T1 [S1] inline — verified; shrink the Liquidación Directa card and verify composition.
- T2 [S2,S3] inline — verified; server gate, login UI, main entry wiring, tests and usage docs. Independent verifier required for security. Commits withheld to preserve the pre-existing mixed dirty worktree.

- T3 [S4,S5] inline — verified; complete React mobile-first app. Domain mapping delegated read-only because documentation/reuse uncertainty exceeds inline evidence budget; implementation stays inline.

## Log
- L1: User request: "la cajita de liquidacion directa esta muy grande y seria mejor un pin ya que vamos a hacer la demo privada y ahi nos llevara a nuestra app web mobile firts"
- L2: Existing root server serves a separate static app, while apps/web contains the React landing. Keep the app's existing localStorage data and hash routes; mount it at /app/. The PIN is a demo access barrier, not production user authentication.

- L3: RED observed: focused server suite could not import createDemoServer before implementation. GREEN: all five server tests pass; root npm test passes; TypeScript and web build pass. Whole-tree diff-check finds only pre-existing trailing blank lines in unrelated runbooks, which remain untouched.

- L4: User correction: "pin de 4 digitos asi con las 4 casillas grandotas, luego de eso es nuestra app completa que construimos basandonos en [Image #1] y pon que este sea el proyecto principal la pagina azul que habiamos diseñado en el root no la vamos a usar a no ser que tenga logica correcta con nuestra docuemntacion"
- L5: Do not resume the previous native review preflight: requirements changed before START and no authority was created. Preserve prior auth test evidence, but recheck the new format and app entry.

- L6: Read-only domain mapping: legacy root quote has no 1% fee or E.A. and only whole-invoice transitions. The new private application calls canonical server-side use cases and TiersPolicy. The blue HTML and /src files are not served; legacy localStorage is read only for a compatibility notice and never migrated.
- L7: RED → GREEN: four-digit gate tests failed against the old 8–12 digit guard, then passed. New private adapter tests failed before its module existed, then passed. Fixed a projection DTO mismatch with a reproducing test (PurchaseParticipation returns {investment}, not the investment directly).
- L8: Functional proof: nine focused server/adapter tests pass, including full invoice/milestone lifecycle, rejected-action immutability, concurrent overfunding and tier progression. Actual browser passes four-box paste/backspace, invoice/hito creation/confirmation/acceptance, partial + second-investor funding, settlement, portfolio, reload, unchanged legacy data, five views at 320/390/430/768px, desktop and logout. TypeScript and Vite build pass. Sandbox data are process-local and reset on restart; no financial persistence format was migrated.
- L9: App compiled code is a lazy private chunk; /api/demo/app and /private/* require the same server session. The shared PIN is exactly four digits, rate limited, not production identity. Local .env.demo was rotated without logging its value. No deployment, publishing or external payment/email service was invoked.

- L10: Independent verification found one blocker: concurrent PIN requests captured separate counters before awaiting bodies. Reproduced with 12 requests whose headers arrived before their bodies (12 incorrect attempts admitted instead of five). Correction reserves the shared budget synchronously before body processing. A deterministic regression test now covers the race. Also clarified the README's legacy-browser vs new-process-local data distinction.

- L11: Independent verifier confirmed S1/S3/S4/S5 and the canonical sandbox/browser flow. B1 targeted recheck: five simultaneous wrong PIN attempts admitted, seven rejected with 429, and a correct PIN afterward also 429. B1 resolved; no other blockers. Parent reran focused server/adapter and full browser checks. Receipt review remains pending candidate consent; no approval claimed.
