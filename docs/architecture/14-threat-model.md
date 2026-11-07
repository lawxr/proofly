# Modelo de Amenazas STRIDE y Fraude de Negocio — Proofly (`docs/architecture/14-threat-model.md`)

Este documento analiza de forma exhaustiva los vectores de ataque técnicos (metodología STRIDE) y los escenarios de fraude financiero que amenazan a **Proofly**, estableciendo las contramedidas arquitectónicas y de código obligatorias.

---

## 1. Análisis STRIDE (Amenazas Técnicas de Software)

| Categoría STRIDE | Vector de Amenaza Específico | Impacto | Contramedida Técnica Implementada |
| :--- | :--- | :---: | :--- |
| **Spoofing** (Suplantación) | Un atacante se hace pasar por un freelancer o empresa contratante para desviar pagos. | Crítico | • Autenticación estricta JWT con tokens efímeros firmados con RS256.<br>• Verificación de identidad biométrica obligatoria (`KycPort`).<br>• Enlaces de confirmación de clientes con tokens criptográficos HMAC de un solo uso y expiración de 72 horas. |
| **Tampering** (Manipulación) | Modificación del monto nominal, fecha de vencimiento o tasa de descuento en tránsito o en base de datos. | Crítico | • Validación estricta con esquemas Zod en `apps/api`.<br>• Invariante de clave canónica `HMAC-SHA256` que invalida la operación si algún parámetro varía.<br>• Restricciones `CHECK` a nivel de base de datos (`chk_valid_advance`, `chk_nominal_share`). |
| **Repudiation** (Repudio) | El freelancer o el pagador niegan haber aceptado la cesión o confirmado el hito. | Alto | • Firma electrónica de mensaje de datos vinculante (Ley 527 de 1999) con registro de IP, User-Agent y timestamp.<br>• Hash del dossier documental anclado on-chain en `ProoflyOperations`. |
| **Information Disclosure** | Fuga de datos personales (PII), montos de facturación o documentos comerciales en la blockchain pública de Base. | Crítico | • **Invariante I3:** Cero PII on-chain. En Base solo residen hashes `bytes32` y cantidades enteras sin nombres ni NITs.<br>• Cifrado en reposo en PostgreSQL (AES-256) y TLS 1.3 en tránsito con HSTS estricto. |
| **Denial of Service** | Ataques de spam en el endpoint de simulación o saturación del worker de outbox con transacciones vacías. | Medio | • Rate-limiting distribuido en Redis (máximo 20 peticiones/minuto por IP en endpoints de cálculo).<br>• Límites de tamaño de payload ($< 5 \text{ MB}$ para subida de XML). |
| **Elevation of Privilege** | Un freelancer o financiador intenta ejecutar funciones reservadas de operador (`mintOperation`, `settleOperation`). | Crítico | • RBAC estricto en NestJS (Guards de rol).<br>• `AccessControlDefaultAdminRules` en Solidity limitando funciones a `OPERATOR_ROLE` y `RECONCILER_ROLE`. |

---

## 2. Vectores Críticos de Fraude Financiero y de Negocio

### 2.1. Colusión entre Freelancer y Empresa Contratante
* **Escenario:** Un freelancer crea una empresa ficticia o se alía con un tercero para generar hitos contractuales falsos, cobrar el desembolso del adelanto y desaparecer antes del vencimiento.
* **Mitigación Arquitectónica:**
  1. **Separación de Riesgos (Invariante I14):** Se evalúa por separado el Score de Ejecución del Freelancer y el Score de Solvencia de la Empresa.
  2. **Tope Progresivo Tier 1 (Semilla):** Todo freelancer nuevo tiene un cupo máximo acotado de hasta **$ 2.000.000 COP**. La plataforma nunca arriesga capitales elevados en operaciones iniciales.
  3. **Verificación Registral de Empresas:** Solo empresas con NIT activo y reporte positivo en centrales de información crediticia habilitan hitos de más de $ 5.000.000 COP.

### 2.2. Intento de Doble Financiación (Double-Dipping)
* **Escenario:** El usuario sube la misma factura electrónica a Proofly y a otra entidad de factoring tradicional, o intenta fraccionar dos veces el mismo hito.
* **Mitigación Arquitectónica:**
  1. **Consulta RADIAN en Tiempo Real:** El `InvoiceVerificationPort` verifica que la factura no posea eventos de endoso ni limitaciones al cobro en el sistema de la DIAN.
  2. **Clave Canónica HMAC:** El cálculo determinista `HMAC-SHA256(secret, payload)` indexado como `UNIQUE` en PostgreSQL y registrado en el mapping de Solidity rechaza de inmediato cualquier duplicado exacto o modificado superficialmente.

### 2.3. Condición de Carrera en el Fondeo (Race Condition)
* **Escenario:** Dos financiadores intentan comprar el último 10 % disponible de una operación exactamente en el mismo milisegundo.
* **Mitigación Arquitectónica:**
  * Uso de transacciones PostgreSQL con nivel de aislamiento serializable o bloqueo pesimista:
  ```sql
  SELECT id, nominal_amount_cents, funded_amount_cents 
  FROM operations 
  WHERE id = $1 
  FOR UPDATE;
  ```
  * Si `funded_amount_cents + requested_share > nominal_amount_cents`, la transacción revierte limpiamente con un error `INSUFFICIENT_AVAILABLE_QUOTA`, impidiendo el sobre-fondeo.

### 2.4. Manipulación Circular de Reputación
* **Escenario:** Un freelancer se auto-financia operaciones pequeñas entre cuentas controladas por él mismo para inflar artificialmente su puntaje y ascender a Tier 3 Pro.
* **Mitigación Arquitectónica:**
  * Detección de grafos de transacciones: el algoritmo de scoring detecta coincidencias de IP, dispositivos o cuentas bancarias de recaudo entre el freelancer y los financiadores fondeadores.
  * Requisito de diversidad de financiadores: para ascender de Tier se exige que las operaciones previas hayan sido fondeadas por al menos 3 financiadores no relacionados.

