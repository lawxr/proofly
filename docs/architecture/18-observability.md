# Estrategia de Observabilidad y Métricas — Proofly (`docs/architecture/18-observability.md`)

Este documento especifica la arquitectura de telemetría de **Proofly**, diseñada para proporcionar visibilidad operativa, auditoría financiera en tiempo real y detección temprana de anomalías tanto en la API como en la capa blockchain de Base.

---

## 1. Logs Estructurados en Formato JSON

Toda la aplicación (`apps/api` y `apps/worker`) emite logs estructurados en JSON utilizando **Pino**:
* Cada petición HTTP entrante recibe o genera un `x-correlation-id` único propagado a través de todo el ciclo de ejecución.
* **Prohibición de Datos Sensibles en Logs:** Los interceptores sanitizan automáticamente tokens JWT, correos, documentos de identidad y números de cuenta bancaria.

```json
{
  "level": "info",
  "time": "2026-11-07T12:00:00.123Z",
  "correlationId": "c4a8d09f-67bc-4f81-9b1b-5f1234567890",
  "context": "FinancialEngine",
  "event": "QUOTE_CALCULATED",
  "operationId": "op_987654",
  "nominalAmountCents": "150000000",
  "advanceAmountCents": "144000000",
  "effectiveAnnualRate": 0.2363,
  "msg": "Quote calculated successfully for operation op_987654"
}
```

---

## 2. Catálogo de Métricas Clave (Prometheus / OpenTelemetry)

### 2.1. Métricas Financieras y de Negocio
* **`proofly_origination_volume_cents_total` (Counter):** Monto acumulado de operaciones solicitadas por freelancers en centavos de COP.
* **`proofly_funded_volume_cents_total` (Counter):** Monto total fondeado por financiadores en el marketplace.
* **`proofly_disbursed_volume_cents_total` (Counter):** Monto neto efectivamente dispersado a cuentas bancarias de freelancers.
* **`proofly_settled_volume_cents_total` (Counter):** Monto total recaudado de pagadores y distribuido vía Waterfall.
* **`proofly_average_effective_annual_rate` (Gauge):** Tasa Efectiva Anual promedio ponderada de las operaciones activas.

### 2.2. Métricas de Blockchain y Worker de Outbox
* **`proofly_outbox_queue_depth` (Gauge):** Número de eventos pendientes de despacho en la tabla `outbox_events`. Alerta crítica si $> 50$.
* **`proofly_outbox_processing_duration_seconds` (Histogram):** Tiempo transcurrido desde la inserción del evento en BD hasta su confirmación minada en Base.
* **`proofly_chain_gas_price_gwei` (Gauge):** Precio actual del gas en Base L2 (EIP-1559 base + priority fee).
* **`proofly_rpc_errors_total` (Counter):** Conteo de fallos o timeouts en llamadas JSON-RPC al nodo de Base.

---

## 3. Alertas Críticas de Producción (PagerDuty / Slack)

1. **Alerta P1 (Discrepancia Contable en Conciliación):** Se dispara si la conciliación diaria de las 23:59 UTC detecta una diferencia $\ne 0 \text{ centavos}$ entre saldos de BD, balances ERC-1155 o extracto bancario.
2. **Alerta P1 (Fallo Crítico de Outbox):** Se dispara si un evento de outbox alcanza su máximo de reintentos (`status = 'FAILED'`).
3. **Alerta P2 (Acumulación de Cola de Fondeo):** Se dispara si el tiempo de despacho on-chain supera los 2 minutos.

