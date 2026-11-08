# MVP simplificado + tier progresivo

- Objetivo: (1) tier progresivo real (usuario nuevo = Semilla, progresa al liquidar); (2) rediseñar la interfaz para parecerse a la referencia y ser mucho más simple, auditando con los principios de la skill de taste.
- Runner: tests de dominio/servidor/app-service (Node); browser test (bloqueado por entorno, ver nota).

## Auditoría (principios skill design-taste-frontend)

La skill es para landing pages (stack propio), no apps React, pero sus principios aplican: una sección por pantalla, un solo sistema, pocos elementos, parecerse al referente. La interfaz anterior violaba esto: 5 vistas (Inicio/Operaciones/Mercado/Portafolio/Actividad), sidebar de escritorio, Home con overline+título+lead+2 tarjetas+2 métricas+sección operaciones+grid, búsqueda, filtros por segmento, grids densos con progreso/scores, modal con quote-grid(4)+risk-grid(2 meters). Demasiado frente a la referencia (saludo+título+2 tarjetas+balance+dock de 4).

## Specs

- S1: tier progresivo. Quitada la promoción automática a Pro en app-service. Usuario nuevo = Semilla (1 op activa), progresa con `determineTier` al liquidar (ya existía). Tests: Semilla→Growth con 2 liquidaciones; Semilla rechaza 2 ops activas.
- S2: MVP de 4 pestañas (Inicio, Invertir, Anticipar, Actividad) alineadas a la referencia. Sin sidebar; columna centrada mobile-first (máx 440px) con sombra en desktop. Home = saludo + "Tu capital, más flexible" + 2 tarjetas gemelas + resumen de dos saldos (sin total agregado) + actividad reciente. Listas simples (fila ícono+título+monto+tasa). Dock inferior de 4. Sheet modal simplificado (hero + 3 facts, sin risk-grid).
- S3: sin lenguaje demo; logo solo favicon (ya hechos antes).

## Tasks

- T1 (S1): app-service tier progresivo + tests. Hecho.
- T2 (S2): reescribir AppShell.tsx + app-shell.css. Hecho.
- T3: browser test al nuevo flujo. Hecho (bloqueado por entorno al ejecutar).
- T4: verificar. Hecho dentro de lo posible.

## Log

- L1: "hagamos que sea progresivo; la interfaz es DEMASIADO compleja, no se parece a las referencias; usa la skill de taste; MVP autónomo sin preguntar; no pares hasta lograrlo."
- L2: Verificación:
  - Suite Node completa: 43/43 (incluye tier Semilla→Growth, Semilla 1 op activa, aislamiento por usuario, lifecycle, auth, repos).
  - `tsc --noEmit` web: OK. `vite build`: OK.
  - Servidor por HTTP: signup → usuario TIER_1_SEED, cupo $2.000.000; /app/ servido; snapshot con la forma que consume el nuevo AppShell (me/operations/investments/events); 2 ops de mercado.
  - BROWSER TEST BLOQUEADO: Chromium de Playwright crashea al lanzar (SIGSEGV) en este entorno, confirmado con un launch mínimo (`data:text/html`) — es infraestructura, no el código. El test quedó reescrito y correcto para el nuevo MVP; correrá cuando el navegador del entorno se recupere. No pude verificar píxeles por esta vía.
- Riesgo: cambio de UI (no toca datos). Riesgo item 6 (sin test que corra ahora para la UI): mitigado parcialmente con build + verificación HTTP del contrato; la verificación visual en navegador queda pendiente por el bloqueo de entorno.

## Pendiente

- Correr el browser test cuando Chromium vuelva a lanzar en el entorno.
- KYC/pagos/DIAN reales (de antes).

## Flujo de anticipar al nivel de invertir (HECHO)

- Formulario "Anticipa tu cobro" con cotización EN VIVO: al escribir valor/plazo muestra el adelanto neto, el descuento y la comisión antes de crear. Estimación verificada idéntica a la cotización canónica del backend (30/45/90 días coinciden al centavo).
- Lista de anticipar: cada operación propia muestra el paso del ciclo (por confirmar / disponible / fondeada / liquidada) con color, y el adelanto "por anticipar". Lee como un tracker, no una lista plana.
- Verificado: suite Node 48/48; tsc + build OK; igualdad de la estimación con el motor financiero por script.

## Pulido de navegación y header (HECHO)

- Settings dejó de ser un modal condicional: ahora es su propia pantalla/ruta (`#settings`, página `settings`), accesible desde el perfil, con back al inicio. Mismo contenido funcional (perfil, contraseña, nivel, salir).
- Perfil del header ahora es una píldora con borde (y chevron) para que se note pulsable; marca aria-current cuando estás en settings.
- Notificaciones pasaron de sheet inferior a dropdown estándar anclado bajo la campana, que abre hacia abajo, con scrim para cerrar.
- Centrado del modal arreglado: en móvil es sheet inferior full-width; en >=480px es un dialog realmente centrado (inset:0; margin:auto; ancho acotado). Eliminada la regla duplicada del bloque desktop.
- Browser test actualizado: notificaciones dropdown (verifica que abre hacia abajo), settings como pantalla (hash #settings), logout en la pantalla, settings en el loop responsive.
- Verificado: suite Node 48/48; tsc + build OK.