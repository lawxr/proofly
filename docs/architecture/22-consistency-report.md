# Informe de Consistencia Cruzada de Arquitectura — Proofly (`docs/architecture/22-consistency-report.md`)

Este informe audita y certifica la consistencia cruzada 1:1 entre los estados canónicos, esquemas de base de datos relacional (PostgreSQL), contratos inteligentes (Solidity en Base L2), especificación de API (OpenAPI 3.1) y la interfaz de usuario en Modo Claro.

---

## 1. Matriz de Consistencia de Estados Canónicos

| Estado Canónico (`TypeScript`) | Enum PostgreSQL (`operation_status`) | Enum Solidity (`OperationState`) | OpenAPI 3.1 (`OperationResponse`) | Etiqueta UI (Modo Claro) | Token de Color UI |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DRAFT` | `'DRAFT'` | `Draft (0)` | `DRAFT` | `Borrador` | `#F6F5F8` (Neutro) |
| `PENDING_CLIENT_CONFIRMATION` | `'PENDING_CLIENT_CONFIRMATION'`| `PendingConfirmation (1)` | `PENDING_CLIENT_CONFIRMATION` | `Esperando al Cliente` | `#F6F5F8` (Pulsante) |
| `PENDING_VERIFICATION` | `'PENDING_VERIFICATION'` | `PendingVerification (2)` | `PENDING_VERIFICATION` | `Validando Factura` | `#F6F5F8` (Pulsante) |
| `QUOTED` | `'QUOTED'` | `Quoted (3)` | `QUOTED` | `Oferta Lista` | `#F8D4FD` (Lavanda) |
| `APPROVED_PENDING_FUNDING` | `'APPROVED_PENDING_FUNDING'` | `OpenForFunding (4)` | `APPROVED_PENDING_FUNDING` | `En Fondeo` | `#7300FF` (Violeta) |
| `ACTIVE_FUNDED` | `'ACTIVE_FUNDED'` | `Funded (5)` | `ACTIVE_FUNDED` | `Fondeada` | `#16A34A` (Verde suave) |
| `DISBURSED` | `'DISBURSED'` | `Disbursed (6)` | `DISBURSED` | `Adelanto Pagado` | `#16A34A` (Verde suave) |
| `SETTLED` | `'SETTLED'` | `Settled (7)` | `SETTLED` | `Liquidada` | `#16A34A` (Verde esmeralda) |
| `PARTIALLY_SETTLED_OVERDUE` | `'PARTIALLY_SETTLED_OVERDUE'` | `OverduePartial (8)` | `PARTIALLY_SETTLED_OVERDUE` | `En Mora / Pago Parcial` | `#E11D48` (Alerta rosa) |
| `REJECTED_CANCELLED` | `'REJECTED_CANCELLED'` | `Cancelled (9)` | `REJECTED_CANCELLED` | `Cancelada / Rechazada` | `#52525B` (Gris oscuro) |

**Veredicto de Consistencia de Estados:** **100 % CONGRUENTE.** No existen estados huérfanos ni discrepancias terminológicas entre capas.

---

## 2. Consistencia de Tipos y Precisión Numérica Monetaria

| Capa Tecnológica | Tipo de Dato para Moneda (COP) | Manejo de Decimales | Soporte de Enteros | Verificación de Invariante I9 |
| :--- | :--- | :---: | :---: | :---: |
| **Dominio TypeScript** | `bigint` | Centavos enteros ($0$ decimales) | $2^{64}-1$ seguro | ✅ Cumple |
| **PostgreSQL 16** | `BIGINT` | Centavos enteros ($0$ decimales) | $-9.22 \times 10^{18}$ a $+9.22 \times 10^{18}$ | ✅ Cumple |
| **Solidity (Base L2)**| `uint256` | Centavos enteros ($0$ decimales) | $2^{256}-1$ seguro | ✅ Cumple |
| **OpenAPI 3.1 JSON** | `integer (int64)` | Centavos enteros ($0$ decimales) | String/Number 64-bit | ✅ Cumple |
| **Frontend UI** | Formateador `$ 1.500.000 COP` | Exclusivo en capa de vista | `Intl.NumberFormat('es-CO')` | ✅ Cumple |

**Veredicto de Precisión Aritmética:** **100 % CONGRUENTE.** Prohibido el uso de flotantes (`float/double/number`) para cálculos financieros en todo el monorepo.

---

## 3. Consistencia de la Clave Canónica Anti-Duplicado (HMAC)

* **Generación:** `AntiDuplicateService` en `packages/domain` utiliza `crypto.createHmac('sha256', SERVER_HMAC_SECRET)`.
* **Almacenamiento BD:** Columna `operations.canonical_hmac VARCHAR(64)` con restricción `UNIQUE`.
* **Smart Contract:** Mapping `mapping(bytes32 => bool) public isHmacRegistered` en `ProoflyOperations.sol`.
* **Representación:** Conversión determinista `0x${hexHmac}` hacia `bytes32` en el Worker de Outbox antes de invocar la red Base.

**Veredicto Anti-Duplicado:** **100 % CONGRUENTE.** El cerrojo doble opera de forma atómica y sin fricciones de tipos.

