# Desarrollo de producto — bloque autónomo

- Objetivo: avanzar el máximo del producto mientras el usuario está ocupado. Decisiones confirmadas.
- Restricción de entorno: navegador (Playwright) y push a GitHub bloqueados por el sandbox. Verifico con la suite Node (43/43 funcionan); commits locales; el usuario pushea. Browser test queda listo para cuando el navegador se recupere.

## Decisiones confirmadas

- D1 Desktop: restaurar desktop real con layout de dos zonas (nav lateral + contenido), reusando el sistema visual del rediseño mobile. Conservar mobile tal cual.
- D2 Header: quitar el logout de arriba. Campana de notificaciones a la derecha; perfil/avatar pulsable a la izquierda que abre ajustes del usuario (con Salir dentro, datos de cuenta, nivel/cupo). Notificaciones reales desde los eventos de la cuenta.
- D3 Invertir: flujo dedicado (pantalla/vista de detalle de la operación: monto, retorno estimado, plazo, confirmar), diferente al sheet modal genérico.

## Specs

- S1 (D1): en >=1024px, dos zonas — rail de navegación lateral con las 4 secciones + el contenido en una columna ancha (no el teléfono estrecho). Mobile intacto (<1024px). Un solo sistema de estilos.
- S2 (D2): header sin botón Salir. Izquierda: avatar+saludo pulsable → abre vista/sheet de Ajustes (nombre, correo, nivel y cupo, botón Salir). Derecha: campana con contador de notificaciones no leídas; al pulsar, lista de notificaciones derivadas de los eventos de la cuenta.
- S3 (D3): "Invertir" lista operaciones; al elegir una, una vista de detalle dedicada (no el sheet genérico) con el valor, el plazo, la tasa E.A., el adelanto, el fondeo pendiente, un campo de monto y el retorno estimado antes de confirmar. Mantiene la regla de no invertir en lo propio.
- S4: backoff real en OutboxDispatcher (deuda técnica previa): esperar entre reintentos según retry_count, respetar maxRetries.

## Tasks

- T1 (S4): backoff en dispatcher + test. Route: inline.
- T2 (S2): notificaciones derivadas de eventos en el snapshot + UI header (campana + ajustes). Route: inline.
- T3 (D3): vista dedicada de invertir. Route: inline.
- T4 (D1): layout desktop de dos zonas en CSS. Route: inline.
- T5: verificar (Node + build; browser test actualizado, no ejecutable aquí).

## Log

- L1: usuario confirma D1/D2/D3 y pide trabajar con lo disponible (sin navegador, commits locales).
- L2: Implementado todo el bloque:
  - T1 backoff: OutboxDispatcher con backoff exponencial (baseDelay*2^retry, cap maxDelay), salta eventos en ventana de espera, respeta maxRetries, reloj inyectable. 3 tests nuevos.
  - T2 header/notificaciones: quitado "Salir" del header. Avatar+saludo pulsable → sheet "Tu cuenta" (nombre, nivel, cupo, puntaje, capital invertido, Salir). Campana con badge de no leídas (derivadas de events, marcado de leído en localStorage) → sheet "Notificaciones" con los eventos de la cuenta.
  - T3 invertir dedicado: para operación disponible no propia, hero con la tasa E.A. destacada, estimación de ganancia/total EN VIVO al escribir el monto (sin botón intermedio), validación de monto sobre el fondeo, botón "Invertir $X". Quitado estado `preview`/acción `simulate` de la UI.
  - T4 desktop: en >=1024px el shell pasa a dos zonas (rail lateral con marca + navegación, contenido ancho max 760-820px); el dock se convierte en rail; sheets centrados. Mobile intacto.
- L3: Verificación (sin navegador, bloqueado por sandbox):
  - Suite Node: 46/46 (incluye 3 de backoff).
  - tsc --noEmit + vite build: OK.
  - HTTP: signup→Semilla $2.000.000; invertir en operación de mercado registra participación y evento `participate`; eventos traen `kind` para notificaciones; tasa real 27.75% E.A.
  - Browser test reescrito para el nuevo flujo (header, notificaciones, ajustes, invertir en vivo, logout en ajustes); NO ejecutable aquí (Chromium crashea por sandbox).
- Bloqueos de entorno persistentes: push GitHub (sin credenciales accesibles) y Playwright (crash al lanzar). Commits quedan locales; el usuario pushea.
- L4: Pulido pedido — "settings de verdad". El sheet anterior era solo lectura. Ahora son ajustes funcionales con persistencia:
  - Dominio: `UpdateProfileUseCase` (edita legalName con validación) y `ChangePasswordUseCase` (verifica la actual con scrypt, re-hashea la nueva). Tests 6/6 en auth.
  - Servidor: `/api/account/profile` (PATCH) y `/api/account/password` (POST), autenticados, same-origin, inyectados vía `account`.
  - Frontend: sheet "Ajustes" con secciones reales — Perfil (editar nombre; correo/documento quedan como identidad/KYC, no editables por diseño fintech), Contraseña (actual + nueva), resumen de nivel, y Salir diferenciado.
  - Verificación HTTP: editar nombre persiste (snapshot refleja); cambiar contraseña rechaza la actual equivocada (403), acepta la correcta (200), y el login con la vieja falla / con la nueva funciona. Suite Node 48/48.
