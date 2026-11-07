# Matriz de Autorización (RBAC y ABAC) — Proofly (`docs/architecture/15-authz-matrix.md`)

Este documento especifica el modelo de control de acceso híbrido basado en roles (**RBAC**) y atributos contextuales (**ABAC**) que gobierna tanto la API REST en NestJS como los contratos inteligentes en la red Base L2.

---

## 1. Definición de Roles del Ecosistema

* **`ANONYMOUS`:** Usuario no autenticado (acceso a landing page, simulación pública de cotización y vista pública de verificación de token).
* **`FREELANCER`:** Profesional independiente verificado; puede registrar facturas/hitos, firmar cesiones y solicitar retiros a su cuenta bancaria.
* **`FINANCIER`:** Inversionista con KYC verificado; puede explorar el marketplace, simular retornos, fondear operaciones y cobrar rendimientos.
* **`CLIENT_PAYER`:** Representante de la empresa contratante; interactúa principalmente a través de enlaces seguros sin necesidad de credenciales complejas.
* **`OPERATOR`:** Personal técnico de Proofly responsable de conciliar extractos bancarios, supervisar colas y resolver excepciones.
* **`ADMIN`:** Gestión de parámetros globales de plataforma, políticas de cupos y pausas de emergencia.

---

## 2. Matriz de Autorización por Endpoint y Caso de Uso

| Recurso / Endpoint | Método | `ANON` | `FREELANCER` | `FINANCIER` | `CLIENT` | `OPERATOR` | Regla Contextual (ABAC) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `/quotes/simulate` | `POST` | ✅ | ✅ | ✅ | ❌ | ✅ | Libre acceso para propósitos educativos y de cotización. |
| `/operations/invoice` | `POST` | ❌ | ✅ | ❌ | ❌ | ❌ | Requiere KYC en estado `VERIFIED`. |
| `/operations/milestone` | `POST` | ❌ | ✅ | ❌ | ❌ | ❌ | Requiere cupo disponible mayor al monto solicitado. |
| `/milestones/{token}/confirm`| `POST` | ✅* | ❌ | ❌ | ✅ | ❌ | *Válido solo si el token criptográfico no ha expirado ni sido consumido. |
| `/operations/{id}/accept-quote`| `POST` | ❌ | ✅ | ❌ | ❌ | ❌ | `operation.freelancer_id == currentUser.id`. |
| `/marketplace` | `GET` | ❌ | ❌ | ✅ | ❌ | ✅ | Solo lista operaciones en estado `APPROVED_PENDING_FUNDING`. |
| `/marketplace/{id}/simulate` | `POST` | ❌ | ❌ | ✅ | ❌ | ✅ | Sin restricciones adicionales. |
| `/operations/{id}/participations`| `POST`| ❌ | ❌ | ✅ | ❌ | ❌ | `currentUser.kyc == VERIFIED` y `userBalance >= amount`. |
| `/financier/portfolio` | `GET` | ❌ | ❌ | ✅ | ❌ | ❌ | `participation.financier_id == currentUser.id`. |
| `/settlement/reconcile` | `POST` | ❌ | ❌ | ❌ | ❌ | ✅ | Requiere rol `OPERATOR` con autenticación 2FA. |
| `/admin/settings` | `PUT` | ❌ | ❌ | ❌ | ❌ | 👑 | Exclusivo para administradores designados. |

---

## 3. Matriz de Roles en Smart Contracts (`Solidity`)

| Función en Contrato | Contrato Destino | `DEFAULT_ADMIN` | `OPERATOR_ROLE` | `RECONCILER_ROLE` | Dirección Externa |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `setKycStatus(address, bool)` | `ProoflyKYCRegistry` | ✅ | ✅ | ❌ | ❌ |
| `setBatchKycStatus(address[], bool)`| `ProoflyKYCRegistry` | ✅ | ✅ | ❌ | ❌ |
| `mintOperation(...)` | `ProoflyOperations` | ✅ | ✅ | ❌ | ❌ |
| `settleOperation(...)` | `ProoflyOperations` | ✅ | ❌ | ✅ | ❌ |
| `transferFrom(...)` (Hook `_update`)| `ProoflyOperations` | ❌ | ❌ | ❌ | ✅ (Si ambos tienen KYC) |

