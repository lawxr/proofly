# ADR-0002: Máquina de Estados Canónica Unificada y Clave HMAC Anti-Duplicado

* **Estado:** Aprobado
* **Fecha:** 2026-11-07
* **Contexto Técnico:** Ciclo de Vida de Operaciones y Prevención de Fraude

---

## Contexto y Planteamiento del Problema
Proofly maneja dos modalidades de originación: **Facturas Electrónicas** (títulos valores con eventos RADIAN) e **Hitos Contractuales** (cesión de créditos futuros aceptados por clientes). Si cada modalidad manejara su propio ciclo de estados o si los estados de base de datos no se mapearan exactamente con el contrato Solidity y la UI móvil, se producirían desincronizaciones críticas. Asimismo, existe el riesgo de que un usuario financie dos veces el mismo documento o que un hash público en Base permita deducir cédulas o NITs por fuerza bruta.

## Opciones Consideradas
1. **Máquinas de estado separadas para Facturas e Hitos con hash simple SHA-256.**
2. **Máquina de estados canónica unificada de 10 estados con clave HMAC-SHA256 con secreto de servidor.**

## Decisión Tomada
Se elige la **Opción 2**:
1. Implementar una **Máquina de Estados Canónica Unificada** de 10 estados (`DRAFT`, `PENDING_CLIENT_CONFIRMATION`, `PENDING_VERIFICATION`, `QUOTED`, `APPROVED_PENDING_FUNDING`, `ACTIVE_FUNDED`, `DISBURSED`, `SETTLED`, `PARTIALLY_SETTLED_OVERDUE`, `REJECTED_CANCELLED`) mapeada 1:1 con `enum OperationState` en Solidity.
2. Generar para cada operación un identificador canónico mediante `HMAC-SHA256(SERVER_SECRET, canonical_payload)` con doble candado: `UNIQUE CONSTRAINT` en PostgreSQL y mapping `isRegisteredOperation` en el contrato `ProoflyOperations`.

## Consecuencias
* **Positivas:**
  * Cumplimiento estricto de la Invariante I5 (Doble financiación bloqueada) e Invariante I3 (Privacidad off-chain sin fuga de PII).
  * Consistencia total entre vistas de frontend, lógica de backend y estados del contrato ERC-1155.
* **Negativas:**
  * Requiere gestión y rotación segura del secreto `SERVER_HMAC_SECRET` en variables de entorno.

