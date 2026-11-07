# Prompts Maestros de Construcción (Fases 2 a 8) — Proofly (`docs/plan/prompts-fases-2-8.md`)

Este documento contiene los prompts definitivos de ingeniería para ejecutar secuencialmente las **Fases 2 a 8** de la construcción de **Proofly**, incorporando toda la arquitectura formalizada en la Fase 1 y las directivas de las skills de diseño instaladas.

---

## Prompt Fase 2: Fundaciones del Monorepo y Entorno Multi-Red

```markdown
# FASE 2 — Fundaciones del Monorepo, Configuración y Docker

## OBJETIVO
Inicializar el monorepo Turborepo para Proofly con tipado TypeScript estricto, levantar la infraestructura local mediante Docker Compose y configurar los Design Tokens de Proofly en Tailwind CSS.

## TAREAS
1. Inicializar Turborepo con la estructura de paquetes y aplicaciones:
   - `packages/domain`: Biblioteca TypeScript pura (cero dependencias de framework).
   - `packages/contracts-sdk`: Tipos TypeScript y ABIs generados para Base.
   - `apps/api`: Aplicación NestJS modular.
   - `apps/worker`: Worker asíncrono de Node.js.
   - `apps/web`: Aplicación React + Vite.
   - `contracts/`: Proyecto Foundry en Solidity 0.8.24+.
2. Crear `docker-compose.yml` local con:
   - PostgreSQL 16 con extensiones `uuid-ossp` y `pgcrypto` montando `db/schema.sql`.
   - Redis 7 para caché de cotizaciones y rate-limiting.
   - Nodo Anvil local preconfigurado con Chain ID 84532 (Base Sepolia emulado).
3. Configuración tipada de entorno con Zod en `apps/api/src/config/env.schema.ts` validando `ENV_MODE=sandbox|production`.
4. Configuración base de Tailwind CSS en `apps/web` con los tokens exactos de Proofly (`#FFFFFF`, `#F8D4FD`, `#000000`, `#7300FF`, `#F6F5F8`, `#16A34A`, `#E11D48`).

## ENTREGABLES
- Monorepo configurado y funcional.
- docker-compose.yml y scripts npm (`dev`, `build`, `test`, `lint`).
- apps/api/src/config/env.schema.ts.
- apps/web/tailwind.config.js y tokens de color.

## CIERRE
Aplica el formato de cierre obligatorio y DETENTE. Espera «APROBADO FASE 2».
```

---

## Prompt Fase 3: Dominio, FinancialEngine y Backend Núcleo

```markdown
# FASE 3 — Dominio Puro, FinancialEngine y Backend Núcleo (NestJS)

## OBJETIVO
Implementar en `packages/domain` el núcleo de dominio en TypeScript puro (incluyendo el `FinancialEngine` con Algoritmo del Mayor Resto y tests de propiedades), los repositorios PostgreSQL y los endpoints REST de originación en NestJS.

## TAREAS
1. Implementar en `packages/domain`:
   - `FinancialEngine`: cálculo exacto de $V_n$, $d$, $A$, $C_p$, $K$, $G_f$, Tasa E.A. y Algoritmo del Mayor Resto (`allocateWithLargestRemainder`).
   - Suite de pruebas basadas en propiedades con `fast-check` verificando que la suma de partes sea idéntica al recaudo ($0 centavos de error) en 10.000 iteraciones.
   - `OperationStateMachine`: máquina de estados canónica de 10 estados con guardas y transiciones deterministas.
   - `AntiDuplicateService`: generación de HMAC-SHA256 canónico para facturas e hitos.
   - `TiersPolicy`: asignación y ascenso de cupos para freelancers (Tier 1 a Tier 3).
2. Implementar en `apps/api`:
   - Módulos NestJS: Auth, Users, Operations, Marketplace, Settlement.
   - Repositorios con Drizzle/Prisma sobre PostgreSQL implementando las restricciones de `db/schema.sql`.
   - Adaptadores Sandbox (Mocks deterministas) para `InvoiceVerificationPort`, `MilestoneConfirmationPort`, `KycPort`, `PaymentRailPort`.
   - Endpoints REST de originación y cotización conforme a `api/openapi.yaml`.
3. Validar los 6 escenarios numéricos de `docs/architecture/06-financial-model.md` con tests automatizados.

## ENTREGABLES
- Código fuente en packages/domain con cobertura de tests > 95%.
- Módulos y controladores en apps/api.
- Pruebas unitarias y de integración pasando al 100%.

## CIERRE
Aplica el formato de cierre obligatorio y DETENTE. Espera «APROBADO FASE 3».
```

---

## Prompt Fase 4: Contratos Inteligentes en Base L2 (Foundry)

```markdown
# FASE 4 — Contratos Inteligentes Solidity en Base L2 (Foundry)

## OBJETIVO
Desarrollar, compilar, auditar y someter a fuzzing los contratos inteligentes de Proofly en Solidity 0.8.24+ utilizando Foundry, listos para despliegue en Base Sepolia y Base Mainnet.

## TAREAS
1. Desarrollar en `contracts/src/`:
   - `ProoflyKYCRegistry.sol`: lista blanca y control de acceso con `AccessControlDefaultAdminRules`.
   - `ProoflyOperations.sol`: estándar ERC-1155 restringido con hook `_update` que bloquea transferencias a wallets sin KYC, registro HMAC único y liquidación con hash de comprobante bancario.
2. Desarrollar suite de pruebas en `contracts/test/`:
   - Pruebas unitarias de cada función y caso de error personalizado.
   - Pruebas de invariantes y fuzzing (10.000 corridas) sobre el suministro total de tokens y la imposibilidad de duplicar claves HMAC.
   - Tests de rechazo de transferencia para billeteras no autorizadas en KYC.
3. Ejecutar análisis estático con Slither y corregir cualquier advertencia.
4. Crear scripts de despliegue en Foundry (`contracts/script/Deploy.s.sol`) parametrizados por variables de entorno (`RPC_URL`, `OPERATOR_PRIVATE_KEY`).

## ENTREGABLES
- contracts/src/ProoflyKYCRegistry.sol y contracts/src/ProoflyOperations.sol.
- Suite de pruebas Foundry en contracts/test/ con 100% de éxito.
- Reporte Slither limpio.
- Scripts de despliegue parametrizados para Base Sepolia y Mainnet.

## CIERRE
Aplica el formato de cierre obligatorio y DETENTE. Espera «APROBADO FASE 4».
```

---

## Prompt Fase 5: Integración Backend + Blockchain y Sincronización

```markdown
# FASE 5 — Integración Backend + Blockchain, Worker de Outbox y Conciliación

## OBJETIVO
Construir el worker asíncrono en `apps/worker` que procesa la tabla `outbox_events`, despacha transacciones a Base con `viem`, indexa eventos y ejecuta la conciliación diaria de saldos.

## TAREAS
1. Implementar el `OutboxDispatcher` en `apps/worker`:
   - Polling concurrente seguro con `SELECT ... FOR UPDATE SKIP LOCKED`.
   - Integración con `viem` para llamadas `mintOperation` y `settleOperation`.
   - Reintentos automáticos con retroceso exponencial (*exponential backoff*).
2. Implementar el `EVMEventIndexer`:
   - Escucha de eventos `OperationMinted`, `OperationSettled` y `KycStatusUpdated`.
   - Registro en `indexed_chain_events` con tolerancia a reorganizaciones (espera de 12 bloques de finalidad en Base).
3. Implementar el `DailyReconciliationJob` (Cron 23:59 UTC):
   - Comparación de tres vías: saldos de base de datos vs. supply de tokens ERC-1155 vs. extracto bancario.
   - Generación de reportes de auditoría y emisión de alertas si la discrepancia es > $0 COP.
4. Desplegar los contratos en Base Sepolia testnet y verificar transacciones end-to-end.

## ENTREGABLES
- apps/worker/src/outbox/dispatcher.ts y apps/worker/src/indexer/evm-indexer.ts.
- apps/worker/src/reconciliation/daily-job.ts.
- Contratos desplegados en Base Sepolia con direcciones verificadas.
- Test de integración que demuestre el flujo completo desde outbox hasta confirmación en Base.

## CIERRE
Aplica el formato de cierre obligatorio y DETENTE. Espera «APROBADO FASE 5».
```

---

## Prompt Fase 6: Frontend Web & Mobile Fintech (Modo Claro Proofly)

```markdown
# FASE 6 — Frontend Web & Mobile Fintech (Modo Claro Absoluto)

## OBJETIVO
Construir en `apps/web` la Landing Page interactiva y la Web & Mobile App de Proofly aplicando estrictamente el sistema de diseño en Modo Claro (`#FFFFFF`, `#F8D4FD`, `#000000`, `#7300FF`), las directivas de las skills instaladas (`design-taste-frontend`, `web-design-guidelines`, `stageshow`) y la abstracción Web2.

## TAREAS
1. Configuración de diseño y componentes base:
   - Aplicar las 9 reglas de oro de `design-taste-frontend`: fotografía real, cero descripciones bajo imágenes, una sección por pantalla, bordes equilibrados y micro-interacciones suaves al hover/press.
   - Componentes UI: botones píldora negros (`#000000`), tarjetas Bento de 2 columnas con esquinas redondeadas (`24px`), dock móvil flotante con glassmorphism (`backdrop-filter: blur(16px)`).
2. Construir la Landing Page interactiva:
   - Hero section con estrellas de 8 puntas lavanda (`#F8D4FD`) y tarjetas polaroid flotantes.
   - Bloque de propuesta de valor dual (Freelancer + Financiador).
   - Carrusel Bento horizontal interactivo (01-06) mostrando widgets reales de cálculo de adelanto y retornos.
   - Footer masivo con tipografía cortada a sangre.
3. Construir los flujos de la Aplicación Fintech:
   - **Flujo Freelancer:** Onboarding biométrico, visualización de cupo Tier 1, carga de factura XML o hito, simulador de adelanto instantáneo y firma electrónica.
   - **Flujo Cliente:** Página web ligera y responsive para confirmación de hitos con un toque (`/verify/[token]`).
   - **Flujo Financiador:** Dashboard con métricas de ganancia acumulada en verde (`+$500.000 COP`), marketplace de operaciones con filtros por score y plazo, simulador de checkout en tiempo real y portafolio con botón de retiro bancario.
4. Auditoría de calidad visual:
   - Ejecutar la auditoría de `web-design-guidelines` verificando accesibilidad WCAG 2.1 AA.
   - Validar cero desbordamientos horizontales en viewports móviles de 320px, 390px y 430px.

## ENTREGABLES
- Landing page interactiva en apps/web/src/pages/Landing.tsx.
- Vistas completas de la aplicación fintech (Freelancer, Financiador, Pagador).
- Componentes Bento, simuladores y dock móvil.
- Reporte de verificación limpio contra las directivas de taste-skill y web-design-guidelines.

## CIERRE
Aplica el formato de cierre obligatorio y DETENTE. Espera «APROBADO FASE 6».
```

---

## Prompt Fase 7: Validación Integral (QA-01 a QA-06), Seguridad y Carga

```markdown
# FASE 7 — Validación Integral (QA-01 a QA-06), Seguridad y Pruebas de Carga

## OBJETIVO
Ejecutar la suite completa de pruebas automatizadas E2E con Playwright cubriendo los escenarios QA-01 a QA-06, realizar pruebas de carga con k6 y auditar la seguridad de endpoints y contratos.

## TAREAS
1. Automatizar en Playwright los 6 escenarios maestros:
   - `QA-01`: Onboarding y asignación de cupo Tier 1 Semilla ($ 2.000.000 COP).
   - `QA-02`: Originación por factura electrónica UBL 2.1 con validación RADIAN.
   - `QA-03`: Originación por hito y confirmación de cliente vía token seguro.
   - `QA-04`: Fondeo fraccionado por múltiples financiadores y minteo de tokens ERC-1155.
   - `QA-05`: Recaudo bancario completo y liquidación Waterfall sin pérdida de centavos.
   - `QA-06`: Pago parcial (60 %) y distribución pro-rata entera con Algoritmo del Mayor Resto.
2. Ejecutar pruebas de carga con k6 sobre los endpoints críticos (`/quotes/simulate`, `/marketplace`, `/participations`):
   - Carga sostenida de 100 req/s con picos de 250 req/s.
   - Verificar que el $p95$ de latencia se mantenga por debajo de $150 \text{ ms}$.
3. Auditoría de seguridad: escaneo dinámico OWASP ZAP sobre la API y verificación de permisos RBAC/ABAC.

## ENTREGABLES
- tests/e2e/qa-suite.spec.ts con las pruebas QA-01 a QA-06 en verde.
- scripts/load-test.js y reporte k6.
- Reporte de seguridad sin vulnerabilidades críticas o altas.

## CIERRE
Aplica el formato de cierre obligatorio y DETENTE. Espera «APROBADO FASE 7».
```

---

## Prompt Fase 8: Documentación Operativa, Runbooks y Cierre

```markdown
# FASE 8 — Documentación Operativa, Runbooks de Producción y Lanzamiento

## OBJETIVO
Generar la documentación operativa final, los manuales de procedimientos para incidentes (Runbooks), la guía de conmutación de variables a Base Mainnet y la entrega definitiva del repositorio.

## TAREAS
1. Elaborar Runbooks de Producción en `docs/runbooks/`:
   - `RUNBOOK-01-RECONCILIATION-INCIDENTS.md`: Protocolo ante descuadres de centavos en la conciliación diaria.
   - `RUNBOOK-02-GAS-STUCK-TRANSACTIONS.md`: Reemplazo de transacciones atascadas en Base con mayor gas fee (speed-up / cancel).
   - `RUNBOOK-03-OVERDUE-COLLECTIONS.md`: Protocolo de cobranza prejudicial y mora ante impago de empresas contratantes.
2. Crear la Guía de Conmutación a Producción (`docs/deployment/mainnet-switch.md`):
   - Lista de verificación de variables de entorno para pasar a Base Mainnet (`ENV_MODE=production`, `CHAIN_ID=8453`).
   - Procedimiento de despliegue y verificación de contratos en BaseScan.
3. Actualizar `README.md`, `docs/STATUS.md` y etiquetar la versión `v1.0.0` en Git.

## ENTREGABLES
- docs/runbooks/ con los 3 runbooks operativos.
- docs/deployment/mainnet-switch.md.
- Repositorio listo para producción y cierre del proyecto.

## CIERRE
Aplica el formato de cierre obligatorio y DETENTE. Espera «APROBADO FASE 8» y «PROYECTO PROOFLY FINALIZADO».
```

