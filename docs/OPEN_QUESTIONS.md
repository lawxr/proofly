# Puntos Críticos y Preguntas de Arquitectura — Proofly (`docs/OPEN_QUESTIONS.md`)

Este documento certifica el cierre formal y exhaustivo de los 12 puntos críticos de arquitectura tras la culminación de la **Fase 1 (Tandas 1A a 1E)** y el cierre de la **Puerta 1**.

---

## 1. Estado Final de los 12 Puntos Críticos de Arquitectura

| # | Punto Crítico | Estado de Resolución | Documento de Especificación Oficial |
| :-: | :--- | :---: | :--- |
| **1** | **Cálculo transparente de ganancias del financiador y adelanto del freelancer** | **CERRADO** | [`docs/architecture/06-financial-model.md`](architecture/06-financial-model.md) |
| **2** | **Máquina de estados unificada (Facturas e Hitos)** | **CERRADO** | [`docs/architecture/04-state-machine.md`](architecture/04-state-machine.md), [`09-smart-contract-spec.md`](architecture/09-smart-contract-spec.md) |
| **3** | **Clave única anti-duplicado (HMAC)** | **CERRADO** | [`docs/architecture/05-anti-double-financing.md`](architecture/05-anti-double-financing.md), [`db/schema.sql`](../db/schema.sql) |
| **4** | **Financiación directa vs. Pools de liquidez** | **CERRADO** | [`docs/00-contexto/scope-moscow.md`](00-contexto/scope-moscow.md) |
| **5** | **Arquitectura de Puertos Conmutables (Sandbox vs. Producción)** | **CERRADO** | [`docs/architecture/03-ports-adapters.md`](architecture/03-ports-adapters.md), [ADR-0005](adr/ADR-0005-multi-environment-switchable-ports.md) |
| **6** | **Abstracción de Wallets para experiencia Web2** | **CERRADO** | [`docs/architecture/12-wallets-kyc.md`](architecture/12-wallets-kyc.md) |
| **7** | **Oráculo de Recaudo y Liquidación (Waterfall)** | **CERRADO** | [`docs/architecture/11-sync-and-reconciliation.md`](architecture/11-sync-and-reconciliation.md), [`09-smart-contract-spec.md`](architecture/09-smart-contract-spec.md) |
| **8** | **Pagos parciales, prórrogas y mora** | **CERRADO** | [`docs/architecture/06-financial-model.md`](architecture/06-financial-model.md), [ADR-0003](adr/ADR-0003-integer-cent-arithmetic-and-largest-remainder.md) |
| **9** | **Representación monetaria en enteros** | **CERRADO** | [`db/schema.sql`](../db/schema.sql), [`docs/architecture/08-data-model.md`](architecture/08-data-model.md) |
| **10** | **Stack Tecnológico Moderno y Tipado** | **CERRADO** | [ADR-0001](adr/ADR-0001-modular-hexagonal-monolith.md), [`api/openapi.yaml`](../api/openapi.yaml) |
| **11** | **Onboarding progresivo para cualquier Freelancer** | **CERRADO** | [`docs/00-contexto/requirements.md`](00-contexto/requirements.md), [`06-financial-model.md`](architecture/06-financial-model.md) |
| **12** | **Sistema Visual Modo Claro y Terminología Clara** | **CERRADO** | [`docs/fuentes/DESIGN.md`](fuentes/DESIGN.md), [`docs/architecture/17-compliance-by-design.md`](architecture/17-compliance-by-design.md) |

---

## 2. Veredicto de Congelación de Arquitectura (Puerta 1)
No existen preguntas abiertas de arquitectura ni ambigüedades técnicas pendientes. La Arquitectura v1.0 queda congelada como fuente de verdad inmutable para la ejecución de las Fases 2 a 8.
