# Especificación de API REST (OpenAPI 3.1) — Proofly (`docs/architecture/10-api-spec.md`)

Este documento describe la especificación formal de la API REST de **Proofly**, implementada bajo el estándar OpenAPI 3.1.0 en [`api/openapi.yaml`](../../api/openapi.yaml).

---

## 1. Principios de Diseño de la API

* **Unidad Monetaria Universal:** Todos los montos se transmiten como enteros de 64 bits (`int64` / `bigint`) en **centavos de peso colombiano (COP)**. Jamás se reciben ni devuelven valores en punto flotante para magnitudes de dinero.
* **Autenticación y Seguridad:** Endpoints protegidos mediante Bearer JWT con rotación de tokens y claims de rol (`FREELANCER`, `FINANCIER`, `OPERATOR`).
* **Enlace Público Seguro para Clientes:** El endpoint `/api/v1/milestones/{token}/confirm` no requiere cabeceras de autorización; valida la firma criptográfica temporal del token, permitiendo a los clientes corporativos confirmar hitos con un solo clic.
* **Idempotencia en Pagos y Compras:** Los endpoints mutacionales aceptan cabeceras `Idempotency-Key` para evitar cargos duplicados ante reintentos de red.

---

## 2. Mapa de Endpoints por Módulo

| Módulo | Método | Ruta | Rol Autorizado | Propósito |
| :--- | :---: | :--- | :---: | :--- |
| **Cotización** | `POST` | `/api/v1/quotes/simulate` | Público / Freelancer | Simulación matemática instantánea de adelanto en COP. |
| **Originación**| `POST` | `/api/v1/operations/invoice` | `FREELANCER` | Subida de XML y consulta automática de acuses RADIAN. |
| **Originación**| `POST` | `/api/v1/operations/milestone`| `FREELANCER` | Registro de contrato por hitos y despacho de enlace al cliente. |
| **Verificación**| `POST`| `/api/v1/milestones/{token}/confirm`| Público (Token) | Confirmación directa de entregable por el contratante. |
| **Cesión** | `POST` | `/api/v1/operations/{id}/accept-quote` | `FREELANCER` | Firma electrónica vinculante y apertura a fondeo. |
| **Marketplace**| `GET`  | `/api/v1/marketplace` | `FINANCIER` | Catálogo de operaciones disponibles para financiar. |
| **Marketplace**| `POST` | `/api/v1/marketplace/{id}/simulate` | `FINANCIER` | Simulador en tiempo real de ganancia en COP y Tasa E.A. |
| **Fondeo** | `POST` | `/api/v1/operations/{id}/participations`| `FINANCIER` | Adquisición de participaciones fraccionadas. |
| **Recaudo** | `POST` | `/api/v1/settlement/reconcile` | `OPERATOR` / Sistema | Registro de abono bancario y ejecución de Cascada Waterfall. |

---

## 3. Modelo Estándar de Errores (RFC 7807)

Todas las respuestas de error utilizan la estructura `application/problem+json`:

```json
{
  "type": "https://proofly.co/errors/duplicate-operation",
  "title": "Operación ya registrada",
  "status": 409,
  "detail": "La factura electrónica o hito con esta clave canónica ya se encuentra en proceso de financiación.",
  "instance": "/api/v1/operations/invoice",
  "code": "DUPLICATE_CANONICAL_HMAC"
}
```

