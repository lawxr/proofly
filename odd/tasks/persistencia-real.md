# Persistencia real (Postgres) + usuarios reales — reconciliación de schema primero

- Objetivo: dejar de ser demo en memoria. Primero reconciliar `db/schema.sql` con el dominio y los repos Postgres (que hoy divergen), para no migrar después. Incluir desde ya credenciales de usuario (password_hash) para soportar auth real. Luego: driver pg + fábrica por entorno + signup/login persistido.
- Runner: tests de repos Postgres (MockSqlClient), tests nuevos de integración contra Postgres si hay DB, suite existente.

## Divergencias detectadas (dominio = fuente de verdad)

- users: dominio usa legalName/taxId/tier/availableLimitCents/executionScore/completedOperationsCount en una sola entidad; schema los repartía en users + freelancer_profiles y usaba full_name (sin tax_id). Rol INVESTOR ↔ enum FINANCIER.
- operations: dominio/repo usan payerNit/payerLegalName, commercialDiscountCents, prooflyFeeCents (col platform_fee_cents en repo), asset_type; schema usaba company_id (FK), discount_amount_cents, proofly_fee_cents, operation_type, issue_date, monthly_discount_rate (no existen en el dominio).
- investments: dominio/repo usan tabla `investments` (financier_id, tokens_count); schema tenía `participations` con otro modelo.
- outbox: repo usa last_error; schema usa error_log.

## Specs

- S1: `db/schema.sql` reescrito para reflejar EXACTAMENTE lo que los repos Postgres escriben/leen y el dominio define. Una tabla `users` con todas las columnas del UserEntity + `password_hash` (nullable por ahora, para auth). Tabla `operations` con payer_nit/payer_legal_name, commercial_discount_cents, platform_fee_cents, asset_type. Tabla `investments` (financier_id, tokens_count). `outbox_events` con last_error. Enums alineados (asset_type INVOICE/MILESTONE; role con FINANCIER para INVESTOR).
- S2: El repo Postgres (`postgres-repositories.ts`) alineado con el schema: el INSERT de operations incluye payer_nit/payer_legal_name (hoy los omite y mapRowToEntity usa defaults); user save/map incluye password_hash de forma opcional.
- S3: Tests de repos (MockSqlClient) siguen pasando; se añaden asserts de las columnas reconciliadas.

## Tasks

- T1 (S1): Reescribir `db/schema.sql`. Route: inline.
- T2 (S2): Alinear `postgres-repositories.ts`. Route: inline.
- T3 (S3): Actualizar/ampliar `postgres-repositories.test.ts`. Route: inline.
- T4: Verificar contra Postgres real (docker-compose up) que el schema carga y un round-trip básico funciona.

## Log

- L1: "arregla primero los esquemas para que luego no haya que hacer migraciones". Decisión: el dominio es la fuente de verdad; schema y repos se alinean a él. Se elimina el modelo no usado (companies, freelancer_profiles, participations, campos issue_date/monthly_discount_rate) y se añade password_hash para la siguiente rebanada (auth). Riesgo item 1 (datos/schema) — no hay datos productivos aún, DB se recrea desde schema.sql.
- L2: Reconciliado. `db/schema.sql` reescrito (4 tablas: users con password_hash, operations con payer_nit/payer_legal_name + commercial_discount_cents/platform_fee_cents, investments, outbox_events con last_error). Repo Postgres alineado (INSERT de operations ahora incluye payer_*, quitados los defaults falsos en mapRow; user save/map con password_hash). UserEntity del dominio gana passwordHash opcional. Añadido driver pg concreto (PgSqlClient).
- L3: Verificación — todo verde:
  - Tests de repos (MockSqlClient) + dominio: 19/19.
  - docker compose up postgres: schema carga sin errores; 4 tablas creadas; users con todas las columnas del dominio + password_hash.
  - `scripts/verify-postgres.mjs`: round-trip REAL con los repos Postgres reales contra la DB — usuario (con password_hash, INVESTOR↔FINANCIER), operación (payer_* reconciliados, marketplace listing) y outbox. PASS.
  - Suite completa: 37/37. Browser test: PASS.
- Riesgo: item 1 (schema/datos) — mitigado: sin datos productivos, DB se recrea desde schema.sql; round-trip real confirma coherencia. Nota: recrear la DB exige borrar el volumen (docker compose down -v) porque el init solo corre en volumen limpio.

## Rebanada 2 — Auth real + fábrica por entorno (HECHA)

- L4: "sigamos y hagamos lo de quitar demo para la app real". Implementado:
  - `createDependenciesFromEnv` elige Postgres (PERSISTENCE=postgres + DATABASE_URL) vs memoria. `AppDependencies` tipado a puertos; añadido `kycVerifier`.
  - Dominio: `security/password.ts` (scrypt), `use-cases/auth.use-case.ts` (RegisterUserUseCase con KYC inyectable, LoginUseCase con verificación de tiempo uniforme). Tests 4/4.
  - Servidor reescrito: `server.mjs` → `createProoflyServer` con `/api/auth/signup`, `/api/auth/login`, `/api/auth/session` (DELETE), cookie `proofly_session`, same-origin + rate limit. Reemplaza el PIN.
  - App service: `private-app.mjs` → `app-service.mjs`, recibe `deps` compartido y `ctx.userId` (scope por usuario autenticado). Seed de mercado idempotente. Contraparte de mercado interna.
  - Frontend: `DemoLogin` ahora hace signup/login reales (email+contraseña); `DemoApp` apunta a `/api/app` y logout a `/api/auth/session`.
  - Schema: ampliados canonical_hmac (80), confirmation_token (80), electronic_signature_hash (128) — el hmac del dominio es 66 chars; antes varchar(64) era un bug latente.
- L5: Verificación — todo verde:
  - Dominio auth 4/4; servidor auth + app service 10/10 (incluye aislamiento entre dos usuarios); suite completa 41/41; browser test con signup real PASS.
  - `verify-postgres.mjs` y `verify-auth-postgres.mjs` PASS contra DB recreada: signup real → usuario persistido con password scrypt → snapshot autenticado → login contra la DB.
- Riesgo: item 2 (seguridad/auth) + item 1 (datos). Mitigado: contraseñas scrypt con sal, cookie HttpOnly/SameSite, same-origin, rate limit, timing uniforme en login; schema verificado con round-trip real. KYC sigue por adaptador determinista (no es verificación real todavía).

## Rebanada 3 — Outbox compartido + renombrado (HECHA)

- L6: outbox compartido api↔worker. El worker (`apps/worker/src/main.ts`) ahora usa `createDependenciesFromEnv`, tomando el mismo `outboxRepo`. Con PERSISTENCE=postgres api y worker comparten el outbox Postgres (SKIP LOCKED); en memoria se advierte que no se comparte. Ajustado `app-service.allOperations()` para unir operaciones trackeadas + `listMarketplace()` del repo, de modo que la oferta persistida sobreviva reinicios.
- L7: renombrado cosmético. `DemoApp`→`AppShell`, `DemoLogin`→`AuthScreen`, `demo-app.css`→`app-shell.css`, clases `.demo-*`/`.proofly-demo`→`.app-*`/`.proofly-app`. Sin cambio funcional. Quitado el símbolo de logo de la interfaz (header landing, aside de auth, sidebar de la app); el wordmark de texto queda solo. El símbolo permanece solo como favicon/app icon.
- L8: Verificación — todo verde:
  - `verify-outbox-flow.mjs` PASS: API fondea una operación → evento OPERATION_FULLY_FUNDED en outbox Postgres → worker lo lee del mismo outbox → mint on-chain (Funded) en Anvil.
  - Suite completa 41/41; browser test PASS; verify-postgres y verify-auth-postgres PASS.
- Riesgo: item 1 (datos) + item 5 (entorno/cadena). Mitigado con round-trips reales.

## Pendiente

1. El `OutboxDispatcher` no aplica backoff real (retry_count se incrementa pero sin demora). Mejora futura.
2. KYC/pagos/DIAN reales (proveedores externos, requieren credenciales).
3. Enriquecer el payload on-chain (financiadores/dossier reales) — pendiente desde la capa blockchain.
