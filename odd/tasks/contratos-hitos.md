# Contratos por hitos — gestión de recaudo tramo a tramo (Opción A)

- Objetivo: un contrato grande se financia por hitos (milestones); cada hito se confirma, acepta y recauda por separado. Dar una vista bonita para gestionar eso, agrupando los hitos del usuario por contrato, con progreso de recaudo por tramo. Opción A: sobre el modelo actual, sin entidad `contracts` de primera clase; contract_id/milestone_index como metadata de presentación (mismo patrón que title/rate con setPresentation).
- Branch: feat/contratos-hitos (encadenada sobre feat/persistencia-metadata, que aporta setPresentation).
- Delivery strategy: ask-on-risk.
- Runner: `node --experimental-strip-types --test` (dominio + api + worker + tests/*.mjs); `npm run test:browser`; `scripts/verify-metadata-postgres.mjs` (round-trip con restart).

## Specs

- S1: Doc propia (docs/fuentes/enfoque-proofly.md, GLOSSARY.md) define el hito como "contratos/órdenes de trabajo verificables divididos por tramos o hitos (milestones)". Un contrato agrupa varios hitos; el recaudo avanza hito por hito. El modelo A respeta esto agrupando operaciones MILESTONE que comparten contract_id.
- S2: `operations` persiste `contract_id VARCHAR(64)` y `milestone_index INT` como metadata de presentación (nullable; el dominio no los exige). Sobreviven al reinicio igual que title/effective_annual_rate.
- S3: El puerto `OperationRepositoryPort.setPresentation` se extiende (o se añade método) para persistir contract_id/milestone_index junto a title/rate. Entidad `OperationEntity` gana `contractId?`/`milestoneIndex?` opcionales. Las 3 implementaciones del puerto (postgres, in-memory, el mock de use-cases.test.ts) cumplen.
- S4: El snapshot de app-service expone `contractId` y `milestoneIndex` en cada operación serializada. El contrato de serialización existente (title, effectiveAnnualRate, etc.) NO cambia nombres ni tipos (la UI los consume).
- S5: Al anticipar un hito, el usuario puede crear un contrato nuevo o añadir el hito a un contrato existente suyo. milestone_index se asigna secuencialmente dentro del contract_id. Facturas (INVOICE) no se agrupan (contract_id null).
- S6: La pestaña "Actividad" del dock pasa a ser "Contratos": agrupa los hitos propios por contract_id y muestra, por contrato: título del contrato, empresa, número de hitos, hitos liquidados/total, capital recaudado vs capital total del contrato, y una barra de progreso. Cada hito es pulsable y abre el detalle existente. Los hitos sueltos (sin contract_id, o facturas) aparecen igual. La actividad reciente del Home se mantiene.
- S7: Modo memoria sigue funcionando igual (default). El round-trip con Postgres (verify-metadata-postgres) muestra contract_id/milestone_index sobreviviendo al reinicio.

## Tasks

- T1 (S2): Añadir columnas `contract_id`, `milestone_index` a `operations` en db/schema.sql. Route: inline. Risk: item 1 (schema/datos) — DB dev se recrea desde schema, sin datos productivos.
- T2 (S3): Entidad `OperationEntity` +contractId?/milestoneIndex?; puerto `setPresentation` acepta contract_id/milestone_index; repos (postgres + in-memory + mock de test) persisten/leen. Route: inline. Risk: item 3 (contrato de puerto).
- T3 (S4,S5): app-service asigna contract_id (nuevo o existente) y milestone_index secuencial al crear un hito; serialize expone contractId/milestoneIndex; el límite de tier y la lógica existente no cambian. Route: inline. Risk: item 3 (serialización que la UI consume).
- T4 (S6): AppShell — form de anticipar permite elegir/crear contrato para hitos; pestaña "Contratos" agrupa y muestra progreso de recaudo; CSS acorde al sistema violeta. Route: inline. Risk: none (UI).
- T5 (S7): Ampliar verify-metadata-postgres.mjs (o uno nuevo) para cubrir contract_id/milestone_index tras restart. Route: inline. Risk: none (verificación).
- T6: Suite Node + browser test verdes. Route: inline. Risk: none.

## Log

- L1: "La A" + "agreguemos... contratos por hitos". Confirmado enfoque A: agrupar por contract_id/milestone_index persistidos como metadata de presentación (patrón setPresentation de la rama feat/persistencia-metadata). La pestaña Actividad se transforma en Contratos. El dominio ya acepta contractUuid/milestoneIndex en CreateMilestoneOperationUseCase (hoy se generan al vuelo y se descartan: contractUuid=randomUUID, milestoneIndex=1). Encadenado sobre feat/persistencia-metadata porque reutiliza setPresentation. Riesgo: item 1 (migración schema) + item 3 (contrato puerto/serialización).

- L2: Implementado y verificado. Cambios:
  - Dominio: `OperationEntity`/`OperationProps` ganan `contractId?`/`milestoneIndex?` (metadata de presentación). Puerto: `setPresentation(id, title, rate)` -> `setPresentation(id, meta: PresentationMetadata)` con `{title, effectiveAnnualRate, contractId?, milestoneIndex?}` (nuevo tipo exportado).
  - Schema: `operations` gana `contract_id VARCHAR(64)` + `milestone_index INT`; índice parcial `idx_operations_contract` WHERE contract_id IS NOT NULL.
  - Repos: Postgres (INSERT +2 cols, ON CONFLICT COALESCE para ambas, mapRow, setPresentation con objeto), in-memory y mock de use-cases.test.ts alineados a la firma nueva.
  - app-service.mjs: `create` para MILESTONE asigna contract_id (reusa input.contractId si el owner ya tiene ese contrato, con milestone_index = max+1; si no, randomUUID + index 1). El mismo contractUuid/index va al CreateMilestoneOperationUseCase, así el HMAC anti-duplicado distingue hitos del mismo contrato. serialize expone contractId/milestoneIndex vía el spread existente (sin cambios en su contrato).
  - UI (AppShell.tsx): pestaña del dock `activity`->`contracts` (label Contratos, icono folder nuevo; icono layers nuevo). Agrupación `groups` por contractId: contratos (>1 hito) muestran recaudado/total/liquidados + barra de progreso + hitos numerados pulsables + "Añadir hito a este contrato"; facturas e hitos sueltos como ítems únicos. El form de anticipar, al añadir a un contrato, bloquea a MILESTONE, hereda la empresa (readOnly) y muestra nota del hito N. Home: "Ver todo" huérfano -> "Ver contratos" (solo si hay contratos). CSS nuevo acorde al sistema violeta.
  - Tests: mobile.browser.mjs navega a #contracts, verifica la pestaña Contratos agrupa la operación creada; ruta responsive activity->contracts. verify-metadata-postgres.mjs amplía asserts a contract_id/milestone_index tras restart.
- L3: Verificación — todo verde:
  - Suite Node: 48/48.
  - Build web: sin errores de tipos.
  - npm run test:browser PASS: pestaña Contratos agrupa operaciones; 5 rutas limpias 320-1440; sin errores JS. Captura /private/tmp/proofly-contracts.png revisada (header + lead + ítem QA-FACTURA $ 960.000 + dock con slot Contratos).
  - docker compose down -v + up: schema con contract_id/milestone_index + índice.
  - verify-metadata-postgres PASS: contractId (d0a56299) y milestoneIndex (1) sobreviven al reinicio; título/tasa/estado/3 eventos también.
  - verify-postgres PASS: round-trip previo intacto.
- Riesgo: item 1 (migración schema) — mitigado: DB dev recreada desde schema.sql sin datos productivos; round-trip real confirma; recrear exige docker compose down -v. item 3 (contrato puerto/serialización) — mitigado: setPresentation cambió de firma pero las 3 implementaciones del puerto la cumplen y los tests pasan; serialize conserva nombres/tipos existentes y suma campos nuevos opcionales; browser test verde.
- No verificado: cadena on-chain (Anvil no corría; sin cambios en la capa blockchain/outbox).
- Pendientes encadenados (en orden acordado): (2) detalles reales — gráfico balance con datos reales + animación de contadores + separadores de miles donde falle; (3) GDPR cookie policy + privacidad + banner consentimiento; (4) auditoría seguridad con skill Cloudflare (verificar qué es y disponibilidad antes de ejecutar).
