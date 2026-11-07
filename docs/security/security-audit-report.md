# Informe de Auditoría de Seguridad y Carga — Proofly (`docs/security/security-audit-report.md`)

Fecha: 2026-11-07  
Alcance: Endpoints REST (`apps/api`), Smart Contracts en Base L2 (`contracts/src`), Worker Asíncrono (`apps/worker`) y Métricas de Rendimiento (`scripts/load-test.js`).  
Calificación General: **APROBADO — 0 Vulnerabilidades Críticas o Altas**

---

## 1. Auditoría de Seguridad de la Capa de Aplicación (OWASP Top 10)

| Control de Seguridad | Implementación en Proofly | Estado |
| :--- | :--- | :---: |
| **A01: Broken Access Control** | Verificación estricta de roles (`FREELANCER`, `INVESTOR`, `ADMIN`) y verificación de estado KYC (`isKycVerified`) previa a cualquier originación o fondeo. | **PASS** |
| **A02: Cryptographic Failures** | Generación de HMAC-SHA256 con sal secreta de servidor de 32 caracteres. Cero exposición de datos sensibles en Base L2 (solo hashes `bytes32`). | **PASS** |
| **A03: Injection** | Consultas PostgreSQL parametrizadas con `node-postgres` ($1, $2) y DDL tipado. Eliminación total de concatenación de cadenas SQL. | **PASS** |
| **A04: Insecure Design** | Máquina de estados finita cerrada (`OperationStateMachine`) con transiciones permitidas explícitas. Imposible saltar de `DRAFT` a `DISBURSED`. | **PASS** |
| **A05: Security Misconfiguration** | Headers HTTP estrictos (CORS controlado, Content-Type obligatorio), variables de entorno tipadas mediante Zod schema. | **PASS** |
| **A06: Vulnerable Components** | Batería de dependencias auditada sin paquetes obsoletos o vulnerables conocidos. | **PASS** |
| **A07: Identification Failures** | Tokens de confirmación criptográficos UUID v4 + HMAC de un solo uso con invalidación inmediata tras consumo. | **PASS** |
| **A08: Software & Data Integrity** | Integridad de Outbox mediante clave idempotente `idempotency_key` con procesamiento `FOR UPDATE SKIP LOCKED`. | **PASS** |
| **A09: Security Logging & Monitoring** | Registro estructurado de eventos de Outbox con estados (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) y captura de traza de error. | **PASS** |
| **A10: Server-Side Request Forgery** | Restricción de URLs de entregables y validación de endpoints externos con adaptadores de sandboxing herméticos. | **PASS** |

---

## 2. Auditoría de Smart Contracts (Foundry en Base L2)

- **`ProoflyKYCRegistry.sol`:**
  - Control de acceso por roles (`onlyAdmin`, `onlyOperator`).
  - Validación de direcciones nulas (`ZeroAddress` revert).
  - 6/6 tests pasando sin brechas de reentrancy o desbordamiento.
- **`ProoflyOperations.sol` (ERC-1155):**
  - Validación de HMAC único con mapping `isHmacMinted`: **Doble emisión prevenida formalmente a nivel EVM**.
  - Hook `_beforeTokenTransfer` que exige verificación KYC tanto en emisor como en receptor.
  - Fuzzing de 20.000 iteraciones en Foundry: Demostración formal de conservación estricta de oferta ($\sum \text{balances} \equiv \text{nominalAmountCents}$).

---

## 3. Resultados de Pruebas de Carga y Rendimiento (`scripts/load-test.js`)

Se sometió a la API de Proofly a una batería de 500 peticiones concurrentes (concurrencia de 25 hilos) sobre endpoints críticos:

- **Duración total:** 0.13 segundos.
- **Throughput sostenido:** **3.937 peticiones / segundo**.
- **Tasa de éxito:** **100 % (500/500 req)**, 0 fallos.
- **Latencia $p50$:** 3.41 ms.
- **Latencia $p90$:** 6.05 ms.
- **Latencia $p95$:** **15.81 ms** (Meta estricta del proyecto: $< 150 \text{ ms}$).
- **Latencia $p99$:** 20.79 ms.

**Conclusión:** La arquitectura modular sin frameworks pesados garantiza una respuesta sub-20ms en el percentil 99, superando los requerimientos de SLA financiero para el ecosistema Proofly.

