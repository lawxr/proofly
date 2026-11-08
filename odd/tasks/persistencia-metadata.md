# Persistencia real de metadata de operaciones (Postgres) — cerrar seams del MVP

- Objetivo: con PERSISTENCE=postgres, que un usuario cierre sesión, el proceso reinicie, y vea sus operaciones intactas (título, tasa E.A., actividad, operaciones propias en cualquier estado). Hoy title/rate/events/tracked viven solo en Map de app-service.mjs y se huérfanan al reiniciar.
- Branch: feat/persistencia-metadata (desde main).
- Delivery strategy: ask-on-risk.
- Runner: `node --experimental-strip-types --test` (dominio + api + worker + tests/*.mjs); `npm run test:browser`; `scripts/verify-postgres.mjs`; nuevo `scripts/verify-metadata-postgres.mjs`.

## Specs

- S1: El contrato de serialización que consume la UI NO cambia. `serialize(op)` sigue devolviendo `title` (string) y `effectiveAnnualRate` (number) con los mismos nombres y tipos. La UI (`AppShell.tsx`) usa `op.title` y `op.effectiveAnnualRate` en home, invest, detail y rows; no se tocan esos nombres.
- S2: `title` y `effectiveAnnualRate` se persisten en la tabla `operations` (columnas `title VARCHAR(80)`, `effective_annual_rate NUMERIC`). Al reiniciar con Postgres, una operación recuperada del repo tiene su título real y su tasa, no `'Operación'` / `0`.
- S3: Las operaciones propias del usuario en CUALQUIER estado (QUOTED, ACTIVE_FUNDED, SETTLED, etc.) aparecen en su snapshot tras reiniciar, no solo las APPROVED_PENDING_FUNDING. Se reconstruye desde el repo (nuevo `listByFreelancer`), no desde el `Set tracked` en memoria.
- S4: Los eventos de actividad (`events`: create/confirm/accept/participate/settle) se persisten (tabla `activity_events`) y sobreviven al reinicio. La pestaña Actividad y las notificaciones los muestran igual que hoy.
- S5: `projections` y `settlements` dejan de depender de Map efímeros: se derivan al vuelo desde la operación/inversión al construir el snapshot, de modo que una inversión persistida muestre su proyección tras reiniciar.
- S6: Modo memoria sigue funcionando exactamente igual (default). Ningún cambio de comportamiento observable para PERSISTENCE != postgres salvo que ahora los datos vienen del repo cuando el repo los soporta.
- S7: Un test e2e nuevo (`verify-metadata-postgres.mjs`) prueba contra Postgres real: crear operación con título → recrear app-service desde cero (simula restart) → el snapshot sigue mostrando título, tasa, operación propia y evento.

## Tasks

- T1 (S2): Añadir columnas `title`, `effective_annual_rate` a `operations` en `db/schema.sql`. Route: inline. Risk: item 1 (schema/datos) — DB se recrea desde schema, sin datos productivos.
- T2 (S2,S3): Ampliar puerto `OperationRepositoryPort` y entidad para portar title/rate; `PostgresOperationRepository` persiste/lee las columnas; añadir `listByFreelancer(id)`. In-memory repo implementa lo mismo. Route: inline. Risk: item 3 (contrato de puerto que otros consumen).
- T3 (S4): Tabla `activity_events` + puerto/repos (Postgres + in-memory) para guardar y listar por usuario. Route: inline. Risk: item 1.
- T4 (S1,S3,S4,S5,S6): Reescribir `app-service.mjs` para leer title/rate desde la operación, eventos desde el repo de actividad, operaciones propias vía `listByFreelancer`, y derivar projection/settlement al vuelo. Mantener contrato de serialización idéntico. Route: inline. Risk: item 3 (serialización que la UI consume).
- T5 (S7): `scripts/verify-metadata-postgres.mjs` round-trip real con restart simulado. Route: inline. Risk: none (script de verificación).
- T6 (S7): Tests Node de los repos nuevos (MockSqlClient) + app-service con repo que persiste metadata. Route: inline. Risk: none.

## Log

- L1: "Opcion B" — MVP con Postgres persistente de verdad. Cerrar los seams de la auditoría: title/rate/events/tracked viven solo en memoria y se huérfanan al reiniciar con Postgres. Verificado contra el código: schema de `operations` no tiene title ni rate; `app-service.mjs` los guarda en Map; la UI (`AppShell.tsx`) consume `op.title`/`op.effectiveAnnualRate` en todas las pantallas. Sesiones efímeras (Map en server.mjs) se dejan fuera de este feature (seam de menor impacto; se evalúa aparte). Riesgo global: item 1 (migración schema) + item 3 (contrato de serialización/puerto).

- L2: Implementado y verificado. Cambios:
  - Dominio: `OperationEntity`/`OperationProps` ganan `title?`/`effectiveAnnualRate?` (metadata de presentación, opcional, el núcleo no la exige). `OperationRepositoryPort` gana `listByFreelancer(id)` y `setPresentation(id, title, rate)`. Nuevo puerto `ActivityRepositoryPort` + `ActivityEvent` (ports/activity-repository.port.ts), exportado en index.
  - Schema: `operations` gana `title VARCHAR(80)` + `effective_annual_rate NUMERIC`; nueva tabla `activity_events` (user_id, operation_id, kind, title, created_at) con índice por usuario.
  - Repos: Postgres y in-memory implementan `listByFreelancer`/`setPresentation`; el INSERT de operations persiste title/rate con `COALESCE` en el ON CONFLICT para no pisarlas con NULL en saves posteriores (save() se llama sin ellas). `PostgresActivityRepository` + `InMemoryActivityRepository`. `AppDependencies` + ambas fábricas cablean `activityRepo`.
  - app-service.mjs: eliminados los Map `titles/rates/events/projections/settlements` y el `Set tracked` + el wrapper de save. `serialize` lee title/rate de la entidad. `record` escribe en `activityRepo`. `allOperations(meId)` = mercado + `listByFreelancer` + operaciones invertidas (findByInvestorId→findById), todo desde el repo. `projection` y `settlement` se derivan al vuelo (SimulateParticipationUseCase es determinista; settlement se recalcula pro-rata cuando la op está SETTLED).
  - Tests: el `InMemoryOperationRepository` local de use-cases.test.ts implementa los dos métodos nuevos del puerto. `scripts/verify-metadata-postgres.mjs` nuevo (restart simulado con dos app-service sobre la misma DB).
- L3: Verificación — todo verde:
  - Suite Node: 48/48 (incluye private-app.test.mjs, que ejercita el camino en memoria reescrito).
  - docker compose down -v + up: schema nuevo carga; `operations` tiene title/effective_annual_rate; tabla `activity_events` creada.
  - `verify-metadata-postgres.mjs` PASS: op creada con título "Rediseño de marca" / E.A. 0.2791 en el proceso 1 → proceso 2 (deps Postgres nuevas, sin Map heredado) ve título real, tasa, operación propia (APPROVED_PENDING_FUNDING) y 3 eventos de actividad. Antes: "Operación"/0/vacío.
  - `verify-postgres.mjs` PASS: round-trip de schema previo intacto (regresión S2 descartada).
  - `npm run test:browser` PASS: contrato de serialización UI intacto (S1).
- Riesgo: item 1 (migración schema) — mitigado: DB dev recreada desde schema.sql sin datos productivos; round-trip real confirma coherencia; recrear exige `docker compose down -v`. item 3 (contrato puerto/serialización) — mitigado: `serialize()` conserva nombres/tipos de `title`/`effectiveAnnualRate`; browser test verde; el puerto se amplió (métodos nuevos), no se rompió ninguno existente; las 3 implementaciones del puerto los cumplen.
- No verificado: cadena on-chain (Anvil no estaba corriendo). Los cambios no tocan la capa blockchain ni el outbox (el outbox se alimenta desde los use cases vía deps.outboxRepo, no desde el wrapper eliminado), así que no se espera impacto; queda pendiente de verificación con Anvil levantado.
- Fuera de alcance (confirmado): sesiones efímeras (Map en server.mjs) — seam de menor impacto, se evalúa aparte.
