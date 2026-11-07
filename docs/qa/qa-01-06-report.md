# Informe de Pruebas Maestras de Aceptación (QA-01 a QA-06) — Proofly (`docs/qa/qa-01-06-report.md`)

Fecha de ejecución: 2026-11-07  
Estado de la suite: **100 % APROBADA (6/6 tests pasando)**  
Comando de verificación: `node --experimental-strip-types --test tests/e2e/qa-suite.test.ts`

---

## 1. Resumen Ejecutivo
Se ejecutó la suite automatizada integral cubriendo el ciclo de vida completo de originación, verificación regulatoria, confirmación criptográfica, fondeo fraccionado en marketplace, minteo en Base L2, liquidación bancaria completa y distribución de pago parcial bajo el Algoritmo del Mayor Resto.

| Código | Escenario de Prueba | Resultado | Invariantes Validadas |
| :--- | :--- | :---: | :--- |
| **QA-01** | Onboarding y asignación de cupo Tier 1 Semilla ($ 2.000.000 COP) | **PASS** | I12, I13 (Tiers y Quota Policy) |
| **QA-02** | Originación por factura electrónica UBL 2.1 y validación RADIAN | **PASS** | I2, I5 (Validación 3 acuses DIAN) |
| **QA-03** | Originación por hito y confirmación con token criptográfico de un solo uso | **PASS** | I5, I13 (One-Time Token HMAC) |
| **QA-04** | Fondeo fraccionado (60% y 40%) en Marketplace y minteo ERC-1155 Base L2 | **PASS** | I6, I7 (Conservation of Supply) |
| **QA-05** | Recaudo bancario completo (100%) y liquidación Waterfall sin pérdida de centavos | **PASS** | I9, I10 (Waterfall Cascada $0 error) |
| **QA-06** | Pago parcial (60%) y distribución pro-rata entera por Mayor Resto | **PASS** | I9, I10 (Largest Remainder & Mora) |

---

## 2. Detalle de Casos de Prueba

### QA-01: Onboarding y Asignación de Cupo Tier 1 Semilla
- **Condición inicial:** Freelancer nuevo sin historial previo (`completedOperationsCount = 0`).
- **Verificación:** Al completar el KYC, la política `TiersPolicy.determineTier` clasifica al usuario en `TIER_1_SEED` con un cupo exacto de `$ 2.000.000 COP` (`200000000n` centavos).
- **Resultado:** Cumplimiento estricto del invariante de inclusión financiera para talento emergente.

### QA-02: Originación por Factura UBL 2.1 y RADIAN
- **Caso A (Rechazo):** Factura sin acuses de recibo normativos (evento 033 DIAN ausente) $\rightarrow$ Rechazo con HTTP 400 y mensaje explicativo de RADIAN.
- **Caso B (Aprobación):** Factura válida con los 3 eventos normativos $\rightarrow$ Estado `QUOTED` con desglose exacto de adelanto, descuento comercial y comisión Proofly.
- **Resultado:** $\text{Adelanto} + \text{Descuento} + \text{Comisión} \equiv \text{Valor Nominal}$.

### QA-03: Originación por Hito Contractual y Token Seguro
- **Mecanismo:** Generación de token criptográfico HMAC-SHA256 (`confirmationToken`) enviado a la empresa cliente sin requerir registro previo.
- **Verificación de idempotencia:** Tras la primera confirmación exitosa (`PENDING_CLIENT_CONFIRMATION` $\rightarrow$ `QUOTED`), cualquier intento subsiguiente de re-uso es rechazado con HTTP 400.

### QA-04: Fondeo Fraccionado y Minteo ERC-1155 en Base L2
- **Escenario:** Financiador A toma el 60% y Financiador B el 40% restante.
- **Acción:** Al completarse el 100%, la operación pasa a `ACTIVE_FUNDED`. El `OutboxDispatcher` procesa el evento en segundo plano e invoca `mintOperationTokens` en el contrato ERC-1155.
- **Resultado:** Conservación total de suministro ($\sum \text{shares} \equiv V_n$).

### QA-05: Recaudo Bancario Completo y Liquidación Waterfall
- **Escenario:** La empresa deudora transfiere el 100% del valor nominal mediante transferencia ACH.
- **Distribución:** Cascada de pagos acreditando 100% del capital a inversionistas + ganancia pactada según tasa E.A. + comisión de plataforma Proofly.
- **Resultado:** Estado `SETTLED`. Suma de distribuciones igual a $V_n$ con tolerancia de $0 COP.

### QA-06: Recaudo Parcial (60%) y Distribución por Mayor Resto
- **Escenario:** Operación de $ 10.000.000 COP con 3 inversionistas que recibe abono parcial del 60% ($ 6.000.000 COP).
- **Algoritmo:** Mayor Resto asigna enteros exactos de centavos a cada financiador sin redondeos flotantes.
- **Resultado:** Estado `PARTIALLY_SETTLED_OVERDUE`. Cero pérdida de centavos. Activación de protocolo de cobranza sobre el 40% restante.
