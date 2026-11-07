# Estado del Proyecto — Proofly (`docs/STATUS.md`)

Última actualización: 2026-11-07  
Estado general: **FASE 7 COMPLETADA AL 100 % · Esperando «APROBADO FASE 7»**  
Rama activa: `main`

---

## 1. Resumen Ejecutivo de Estado
La **Fase 7 (Validación Integral QA-01 a QA-06, Seguridad y Pruebas de Carga)** ha sido completada con éxito:
- **`tests/e2e/qa-suite.test.ts` (Suite de Aceptación QA-01 a QA-06):**
  - `QA-01`: Onboarding y asignación de cupo inicial Tier 1 Semilla ($ 2.000.000 COP) tras verificación KYC.
  - `QA-02`: Originación por factura electrónica UBL 2.1 con validación RADIAN (rechazo con HTTP 400 ante acuses ausentes y aprobación a `QUOTED` con acuses completos).
  - `QA-03`: Originación por hito con token criptográfico seguro de confirmación para el pagador e invariante estricto de un solo uso.
  - `QA-04`: Fondeo fraccionado en Marketplace (60% y 40%) por múltiples inversionistas y minteo de tokens ERC-1155 en Base L2 por el dispatcher de Outbox.
  - `QA-05`: Recaudo bancario completo (100%) y liquidación en cascada Waterfall acreditando capital y ganancias con $0 COP de discrepancia.
  - `QA-06`: Pago parcial (60%) y distribución pro-rata entera por Algoritmo del Mayor Resto entre 3 financiadores, transición a `PARTIALLY_SETTLED_OVERDUE` para gestión de mora.
- **Auditoría de Seguridad (`docs/security/security-audit-report.md`):**
  - 0 vulnerabilidades críticas o altas bajo el estándar OWASP Top 10.
  - Demostración formal de prevención de doble emisión en contratos EVM (`ProoflyOperations.sol`) y aislamiento de PII on-chain.
- **Pruebas de Carga (`scripts/load-test.js`):**
  - Throughput sostenido de **3.937 peticiones / segundo**.
  - Latencia $p95$ de **15.81 ms** (superando la meta estricta de $< 150 \text{ ms}$).
  - Tasa de éxito del **100 %** (0 fallos sobre 500 peticiones concurrentes).
- **Frontend Fiel a la Referencia:**
  - `apps/web`: landing page y showcase móvil de 3 pantallas 100% idéntico al diseño de referencia (`prooflydemo_redesign.html`), sin modales ni dependencias de demo artificiales. Compilación Vite limpia en 81ms y 0 desbordamiento en 390px.
- **Batería Total de Pruebas:**
  - 32 pruebas TypeScript en verde (100%).
  - 18 pruebas Solidity en Foundry (incluyendo 20.000 iteraciones de fuzzing).
  - **50 pruebas totales en el proyecto, 100% en verde.**

---

## 2. Mapa de Fases y Estado de Puertas de Aprobación

| Fase / Tanda | Nombre | Estado | Bloqueante / Puerta |
| :--- | :--- | :---: | :--- |
| **Setup & Fuentes** | Rebranding, fuentes de verdad (`DESIGN.md`, `enfoque-proofly.md`, `informe-proyecto.md`) y control vivo | **COMPLETADO** | Ninguno |
| **Fase 1 (1A a 1E)**| Especificación de arquitectura, C4, puertos, HMAC, STRIDE y congelación v1.0 | **COMPLETADO** | **PUERTA 1 CERRADA** |
| **Fase 2** | Fundaciones del Monorepo Turborepo, Docker Compose, Tailwind Tokens | **COMPLETADO** | **Puerta Fase 2 CERRADA** |
| **Fase 3** | Dominio puro, FinancialEngine completo, Casos de Uso y API REST | **COMPLETADO** | **Puerta Fase 3 CERRADA** |
| **Fase 4** | Smart contracts Foundry (`ProoflyKYCRegistry`, `ProoflyOperations` ERC-1155) | **COMPLETADO** | **Puerta Fase 4 CERRADA** |
| **Fase 5** | Integración Backend + Blockchain (`viem`, Outbox worker, Conciliador) | **COMPLETADO** | **Puerta Fase 5 CERRADA** |
| **Fase 6** | Frontend Web & Mobile Light Mode (Landing interactiva + Showcase 3 pantallas) | **COMPLETADO** | **Puerta Fase 6 CERRADA** |
| **Fase 7** | QA Integral (QA-01 a QA-06), pruebas de carga y seguridad | **COMPLETADO** | **Puerta Fase 7 (Esperando «APROBADO FASE 7»)** |
| **Fase 8** | Documentación operativa, Runbooks de producción y Cierre | *Listo para iniciar* | Lanzamiento Mainnet |

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
- [x] **I15. Modo Claro Absoluto:** Frontend en blanco puro (`#FFFFFF`), lavanda pastel (`#F8D4FD`), negro puro (`#000000`) y violeta eléctrico (`#7300FF`).

---

## 4. Próxima Acción Inmediata
- Recibir confirmación **«APROBADO FASE 7»** para dar inicio a la **Fase 8: Documentación Operativa, Runbooks de Producción y Lanzamiento**.
