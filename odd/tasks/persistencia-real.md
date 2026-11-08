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

## Siguiente rebanada (no hecha)

1. Fábrica `createDependencies(config)` que lea el entorno y elija repos Postgres (con PgSqlClient) vs in-memory.
2. Auth real: casos de uso signup (hash scrypt) / login (verify) usando UserEntity.passwordHash, reemplazando el PIN.
3. Outbox compartido api↔worker vía PostgresOutboxRepository en ambos procesos.
