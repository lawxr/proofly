# Estado del Proyecto — Proofly (`docs/STATUS.md`)

Última actualización: 2026-11-07  
Estado general: **FASE 3 COMPLETADA AL 100 % · Esperando «APROBADO FASE 3»**  
Rama activa: `main`

---

## 1. Resumen Ejecutivo de Estado
La **Fase 3 (Dominio Puro, FinancialEngine, Casos de Uso y Backend Núcleo REST)** ha sido completada con éxito:
- `@proofly/domain`:
  - `FinancialEngine` con Algoritmo del Mayor Resto, cálculo de adelantos y E.A. y tests de propiedades (10.000 iteraciones).
  - `OperationStateMachine` con 10 estados canónicos y transiciones deterministas.
  - `AntiDuplicateService` HMAC-SHA256 para facturas e hitos.
  - `TiersPolicy` para progresión de cupos de freelancers.
  - Modelos de dominio (`OperationEntity`, `InvestmentEntity`, `UserEntity`, `OutboxEvent`).
  - 8 Casos de Uso del ciclo de vida completo (`SimulateQuote`, `CreateInvoiceOperation`, `CreateMilestoneOperation`, `ConfirmMilestone`, `AcceptQuote`, `SimulateParticipation`, `PurchaseParticipation`, `ReconcileBankReceipt`).
- `@proofly/api`:
  - Servidor REST nativo modular con enrutamiento conforme a `api/openapi.yaml`.
  - Serialización estricta de `bigint` (centavos de COP) y manejo estándar de errores HTTP.
  - Adaptadores en memoria y adaptadores PostgreSQL 16 ([`db/schema.sql`](../../db/schema.sql)) con Transactional Outbox y `SKIP LOCKED` (ADR-0004).
  - Adaptadores sandbox deterministas para RADIAN, Hitos, KYC, Pasarela ACH y Base EVM.
- **21 pruebas automatizadas** ejecutando y pasando al 100 % (7 pruebas funcionales legadas, 9 pruebas unitarias y de propiedades de dominio, 5 pruebas de integración REST y PostgreSQL).

---

## 2. Mapa de Fases y Estado de Puertas de Aprobación

| Fase / Tanda | Nombre | Estado | Bloqueante / Puerta |
| :--- | :--- | :---: | :--- |
| **Setup & Fuentes** | Rebranding, fuentes de verdad (`DESIGN.md`, `enfoque-proofly.md`, `informe-proyecto.md`) y control vivo | **COMPLETADO** | Ninguno |
| **Fase 1 (1A a 1E)**| Especificación de arquitectura, C4, puertos, HMAC, STRIDE y congelación v1.0 | **COMPLETADO** | **PUERTA 1 CERRADA** |
| **Fase 2** | Fundaciones del Monorepo Turborepo, Docker Compose, Tailwind Tokens | **COMPLETADO** | **Puerta Fase 2 CERRADA** |
| **Fase 3** | Dominio puro, FinancialEngine completo, Casos de Uso y API REST | **COMPLETADO** | **Puerta Fase 3 (Esperando «APROBADO FASE 3»)** |
| **Fase 4** | Smart contracts Foundry (`ProoflyKYCRegistry`, `ProoflyOperations` ERC-1155) | *Listo para iniciar* | Puerta Fase 4 |
| **Fase 5** | Integración Backend + Blockchain (`viem`, Outbox worker, Conciliador) | *En cola* | Puerta Fase 5 |
| **Fase 6** | Frontend Web & Mobile Light Mode (Landing interactiva + App Fintech) | *En cola* | Puerta Fase 6 |
| **Fase 7** | QA Integral (QA-01 a QA-06), pruebas de carga y seguridad | *En cola* | Puerta Fase 7 |
| **Fase 8** | Documentación operativa, Runbooks de producción y Cierre | *En cola* | Lanzamiento Mainnet |

---

## 3. Estado de las 15 Invariantes del Sistema

- [x] **I1. Unidad de cuenta comercial (COP):** Centavos enteros (`bigint`/`uint256`), implementado en `@proofly/domain`.
- [x] **I2. Arquitectura multi-entorno por configuración:** `apps/api/src/config/env.schema.ts` validando `ENV_MODE=sandbox|production`.
- [x] **I3. Privacidad on-chain estricta:** `contracts/src/ProoflyOperations.sol` solo almacena `bytes32` opacos.
- [x] **I4. Claridad jurídica y transparencia de retornos:** Ecuación E.A. implementada y testeada en `FinancialEngine`.
- [x] **I5. Doble financiación bloqueada por diseño:** `AntiDuplicateService` HMAC implementado en `@proofly/domain`.
- [x] **I6. Emisión con respaldo completo:** `mintOperation` en Solidity exige shares == nominalAmountCents.
- [x] **I7. Transferencias restringidas:** `safeTransferFrom` en Solidity valida `kycRegistry.isKycVerified`.
- [x] **I8. Desacoplamiento por Puertos y Adaptadores:** Arquitectura hexagonal en monorepo.
- [x] **I9. Exactitud aritmética:** Algoritmo del Mayor Resto probado en `financial-engine.test.ts` con 0 centavos de error.
- [x] **I10. Cascada de pagos (Waterfall):** `settleOperation` en Solidity y DDL en PostgreSQL.
- [x] **I11. Gobernanza arquitectónica:** Arquitectura v1.0 congelada formalmente.
- [x] **I12. Inclusión y explicabilidad para Freelancers:** `TiersPolicy` en `@proofly/domain`.
- [x] **I13. Financiación por Hitos (Milestones):** Integrado en `@proofly/domain`.
- [x] **I14. Separación de riesgos:** Modelado en esquema y lógica de dominio.
- [x] **I15. Modo Claro Absoluto:** Tailwind CSS configurado con Design Tokens Proofly (`#FFFFFF`, `#F8D4FD`, `#000000`, `#7300FF`).

---

## 4. Skills y Directivas de Diseño para Fase 6 (Frontend)
- [x] **`design-taste-frontend` (Leonxlnx/taste-skill):** Instalado en `.agents/skills/design-taste-frontend`.
- [x] **`web-design-guidelines` (Vercel Labs):** Instalado en `.agents/skills/web-design-guidelines`.
- [x] **`stageshow`:** Instalado en `.agents/skills/stageshow`.

---

## 5. Próxima Acción Inmediata
- Recibir confirmación **«APROBADO FASE 3»** para dar inicio a la **Fase 4: Contratos Inteligentes en Base L2 (Foundry)**.
