# Política de privacidad + cookies + banner de consentimiento (Ley 1581)

- Objetivo: dar a Proofly páginas legales reales (privacidad y cookies) y un banner de consentimiento de cookies, alineados a la ley aplicable. Proofly es fintech colombiana: la base legal es la Ley 1581 de 2012 (Habeas Data) + Decretos 1377/2013 y 1074/2015, NO el GDPR (que solo aplicaría con usuarios en la UE). La doc propia (docs/architecture/16-privacy-data-protection.md, ASSUMPTIONS AS-LEG-03) ya fija la Ley 1581 como marco.
- Branch: feat/privacidad-cookies (encadenada sobre feat/contratos-hitos).
- Delivery strategy: ask-on-risk.
- Runner: `npm run build --workspace @proofly/web`; `npm run test:browser`; suite Node para el server.

## Specs

- S1: Página de Política de Privacidad en `/privacidad`, fiel a docs/architecture/16-privacy-data-protection.md: responsable del tratamiento, datos que se recogen (identidad/KYC, contacto, cuenta bancaria, operaciones), finalidades, derechos ARCO (acceso, rectificación, cancelación/olvido, oposición), privacidad on-chain estricta (solo hashes, PII off-chain cifrada AES-256), cifrado en tránsito TLS 1.3, y canal para ejercer derechos. En español, tono profesional neutro.
- S2: Página de Política de Cookies en `/cookies`: qué es la cookie de sesión (`proofly_session`, HttpOnly, estrictamente necesaria), que no se usan cookies de publicidad ni de terceros para rastreo, que el consentimiento se guarda localmente, y cómo revocarlo.
- S3: Banner de consentimiento de cookies en la landing: explica el uso mínimo (cookie de sesión necesaria + preferencia local), con Aceptar y Rechazar; la elección se guarda en localStorage y el banner no reaparece. Rechazar no rompe la app (la cookie de sesión es estrictamente necesaria y se explica como tal). Enlaza a /cookies y /privacidad.
- S4: El servidor sirve `/privacidad` y `/cookies` (mismo index.html del SPA, como /login), sin romper el allowlist de rutas existente ni la seguridad (headers, 404 para rutas desconocidas).
- S5: El footer de la landing enlaza a Privacidad y Cookies.
- S6: Build web limpio; browser test verde (rutas legales cargan, banner aparece y se puede aceptar/rechazar, persiste); suite Node del server verde (rutas nuevas sirven el SPA, rutas desconocidas siguen dando 404).

## Tasks

- T1 (S4): server.mjs sirve /privacidad y /cookies (index.html). Route: inline. Risk: item 3 (contrato de rutas del server) — ampliación aditiva, rutas desconocidas siguen 404.
- T2 (S1,S2): Componentes LegalPage (Privacidad, Cookies) + routing en App.tsx. Route: inline. Risk: none.
- T3 (S3): Banner de consentimiento (CookieConsent) en la landing, consentimiento en localStorage. Route: inline. Risk: none.
- T4 (S5): Enlaces legales en el Footer. Route: inline. Risk: none.
- T5 (S6): Build + browser test (rutas, banner, persistencia) + suite Node server. Route: inline. Risk: none.

## Log

- L1: "agreguemos GDPR Cookie Policy y la politica adecuada" + "sigue con esas dos". Corrección técnica aplicada: la ley aplicable a una fintech colombiana es la 1581 de 2012 (Habeas Data), no el GDPR; la doc propia ya lo fija. Se hace la política fiel a la 1581 (ARCO, privacidad on-chain, cifrado) y la de cookies honesta (solo cookie de sesión necesaria, sin rastreo de terceros). Banner de consentimiento con Aceptar/Rechazar, elección en localStorage. Riesgo global: item 3 (ampliar allowlist de rutas del server) — aditivo.
