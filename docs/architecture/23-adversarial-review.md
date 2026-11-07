# Revisión Adversarial: 15 Escenarios Críticos de Estrés y Fallo — Proofly (`docs/architecture/23-adversarial-review.md`)

Este documento somete la arquitectura de **Proofly** a 15 escenarios adversariales de estrés extremo, condiciones de carrera, fallos de infraestructura y ataques maliciosos, detallando la resolución técnica determinista para cada caso.

---

## 1. Escenario 1: Colisión Concurrente en el Último Cupo (Race Condition)
* **Condición de Estrés:** Dos financiadores (A y B) intentan comprar el último 10 % disponible de una operación ($ 500.000 COP) exactamente en el mismo milisegundo ($t_0$).
* **Resolución Mecánica:**
  1. La API abre una transacción con bloqueo pesimista en PostgreSQL:
     ```sql
     SELECT id, nominal_amount_cents, funded_amount_cents 
     FROM operations WHERE id = $1 FOR UPDATE;
     ```
  2. La transacción de A adquiere el lock primero. Incrementa `funded_amount_cents` al 100 % e inserta la participación.
  3. La transacción de B sale del lock. Evalúa la condición `funded_amount_cents + 50000000 > nominal_amount_cents`.
  4. La transacción de B revierte limpiamente con código HTTP `409 Conflict` (`INSUFFICIENT_AVAILABLE_QUOTA`). El saldo de B permanece intacto. Cero sobre-emisión.

---

## 2. Escenario 2: Pago Parcial con Decimales Periódicos entre Múltiples Financiadores
* **Condición de Estrés:** Una operación de $ 10.000.000 COP financiada a partes iguales por 3 financiadores ($1/3$ cada uno) recibe un pago parcial de $ 5.000.000 COP ($500.000.000 \text{ centavos}$). La división entre 3 resulta en un número periódico ($166.666.666,666... \text{ centavos}$).
* **Resolución Mecánica:**
  1. El `FinancialEngine` invoca `allocateWithLargestRemainder`.
  2. Asignación base entera: $\lfloor 500.000.000 / 3 \rfloor = 166.666.666 \text{ centavos}$ para cada uno. Suma base: $499.999.998 \text{ centavos}$.
  3. Centavos sobrantes: $500.000.000 - 499.999.998 = 2 \text{ centavos}$.
  4. Los residuos decimales son idénticos ($0.666...$). El desempate determinista se realiza por orden cronológico de adquisición de participación.
  5. Financiador 1 recibe: `$ 1.666.666,67 COP` ($166.666.667 \text{ centavos}$).
  6. Financiador 2 recibe: `$ 1.666.666,67 COP` ($166.666.667 \text{ centavos}$).
  7. Financiador 3 recibe: `$ 1.666.666,66 COP` ($166.666.666 \text{ centavos}$).
  8. Suma distribuida: **Exactamente `$ 5.000.000,00 COP` ($500.000.000 \text{ centavos}$)**. Cero pérdida o creación de dinero.

---

## 3. Escenario 3: Caída del Nodo RPC a Mitad de la Liquidación On-Chain
* **Condición de Estrés:** El worker despacha la transacción `settleOperation` a Base y el nodo RPC corta la conexión antes de retornar el hash o recibo.
* **Resolución Mecánica:**
  1. El registro en `outbox_events` permanece en estado `PROCESSING`.
  2. Tras expirar el timeout de 30 segundos, el worker evalúa el estado.
  3. En el siguiente ciclo, antes de reenviar una nueva transacción, el worker consulta el mapping de la operación en el contrato inteligente (`operations[tokenId].state`).
  4. Si la transacción previa se minó con éxito, el worker extrae el evento de los logs de Base, actualiza el outbox a `COMPLETED` y no gasta gas adicional.
  5. Si no se minó, reintenta con el mismo nonce del operador asegurando idempotencia estricta.

---

## 4. Escenario 4: Disputa de un Hito por el Cliente tras Apertura a Fondeo
* **Condición de Estrés:** El cliente confirma el hito, pero antes de completarse el 100 % del fondeo en el marketplace, notifica un desacuerdo comercial con el entregable.
* **Resolución Mecánica:**
  1. La API admite un endpoint de suspensión administrativa `/operations/{id}/pause` accesible por Operadores.
  2. La operación transiciona de inmediato a `REJECTED_CANCELLED`.
  3. Se ejecuta automáticamente un reembolso atómico en base de datos: el capital aportado por los financiadores que habían adquirido participaciones se libera y regresa íntegramente a sus saldos disponibles (`available_balance_cents`).
  4. Dado que la operación nunca alcanzó el 100 % de fondeo, **nunca se minteó ningún token ERC-1155 on-chain ni se desembolsó dinero al freelancer**. Cero pérdidas patrimoniales.

---

## 5. Escenario 5: Intento de Transferencia de Tokens ERC-1155 a Wallet sin KYC
* **Condición de Estrés:** Un financiador malicioso intenta transferir sus participaciones mediante llamada directa al contrato (`safeTransferFrom`) a una dirección externa o a un mixer de privacidad.
* **Resolución Mecánica:**
  1. El contrato `ProoflyOperations` ejecuta el hook interno `_update`.
  2. La función consulta `kycRegistry.isKycVerified(to)`.
  3. Dado que la wallet destino no está activa en `ProoflyKYCRegistry`, la ejecución revierte inmediatamente con el error personalizado `KycVerificationRequired(to)`.
  4. La transacción es rechazada a nivel de EVM antes de mutar cualquier estado.

---

## 6. Escenario 6: Intento de Ataque de Reentrancia en Liquidación
* **Condición de Estrés:** Un contrato atacante intenta invocar repetidamente funciones de liquidación durante la recepción de eventos.
* **Resolución Mecánica:**
  1. El contrato `ProoflyOperations` no realiza transferencias externas de ETH o tokens nativos; opera exclusivamente como libro mayor contable ERC-1155.
  2. Todas las funciones de mutación siguen el patrón *Checks-Effects-Interactions*.
  3. Las funciones mutacionales están restringidas por modificadores de rol `onlyRole(RECONCILER_ROLE)` y cuentan con el bloqueo de reentrancia de OpenZeppelin.

---

## 7. Escenario 7: Reorganización Profunda de Bloques en Base L2 (> 10 Bloques)
* **Condición de Estrés:** La red Base experimenta una reorganización no canónica de 12 bloques debido a problemas de secuenciador.
* **Resolución Mecánica:**
  1. El indexador de Proofly opera con una regla estricta de **12 bloques de retraso de finalidad**.
  2. Ningún evento on-chain se considera definitivo en la base de datos operativa hasta que su bloque de origen tenga al menos 12 confirmaciones adicionales.
  3. El indexador valida el `block_hash` contra su histórico; si detecta un bloque huérfano, retrocede el puntero y re-procesa únicamente los bloques de la cadena principal válida.

---

## 8. Escenario 8: Intento de Doble Registro con Variaciones Tipográficas
* **Condición de Estrés:** Un freelancer intenta registrar dos veces la misma factura cambiando `"fe-001"` por `" FE-001 "` o alterando los ceros del NIT del pagador (`"0800123456"` vs `"800123456"`).
* **Resolución Mecánica:**
  1. El `AntiDuplicateService` aplica normalización canónica previa al hashing:
     - Recorta espacios y pasa strings a minúsculas (`trim().toLowerCase()`).
     - Extrae únicamente dígitos numéricos para NITs y cédulas (`replace(/\D/g, '')`).
  2. El payload resultante es estrictamente idéntico:
     `fe-001|800123456|...` $\rightarrow$ `canonical_hmac` idéntico.
  3. La base de datos rechaza la inserción por violación de la restricción `UNIQUE CONSTRAINT uq_operations_canonical_hmac`.

---

## 9. Escenario 9: Freelancer Solicita Adelanto Superior a su Cupo de Tier
* **Condición de Estrés:** Un freelancer en Tier 1 (cupo de $ 2.000.000 COP) intenta registrar simultáneamente dos hitos de $ 1.500.000 COP cada uno.
* **Resolución Mecánica:**
  1. Al procesar la segunda solicitud, la API evalúa la cuota en una transacción:
     `available_quota_cents = current_quota_cents - sum(active_operations_nominal)`.
  2. Cupo disponible actual: $ 500.000 COP. Monto solicitado: $ 1.500.000 COP.
  3. La API rechaza la solicitud con código HTTP `422 Unprocessable Entity` (`QUOTA_EXCEEDED`) y le explica factor por factor qué debe cumplir para ascender a Tier 2.

---

## 10. Escenario 10: La Empresa Paga Directamente al Freelancer (Desvío de Fondos)
* **Condición de Estrés:** Por error o mala fe, la empresa contratante paga a la cuenta bancaria personal del freelancer en lugar de la cuenta fiduciaria de recaudo de Proofly.
* **Resolución Mecánica:**
  1. El contrato de cesión firmado por el freelancer incluye una cláusula legal de **Mandato de Entrega Inmediata**: el freelancer se constituye en custodio fiduciario de dichos fondos.
  2. Al llegar la fecha de vencimiento sin recaudo en la cuenta fiduciaria, el sistema notifica tanto a la empresa como al freelancer.
  3. Si el freelancer confirma haber recibido el pago, la plataforma genera una orden de débito o botón PSE para que transfiera el recaudo a Proofly.
  4. Si el freelancer no remite los fondos en 48 horas, se suspende automáticamente su cuenta (`freelancer_profiles.tier = 'TIER_1_SEED'`, `execution_score = 0`), se revoca su KYC en `ProoflyKYCRegistry` y se activa el cobro prejudicial con mérito ejecutivo.

---

## 11. Escenario 11: Tasa Calculada Supera el Tope Legal de Usura
* **Condición de Estrés:** Un hito a muy corto plazo (15 días) con alto riesgo genera una tasa efectiva anual matemática de $ 38.5 \% \text{ E.A.}$, cuando la tasa de usura fijada por la Superfinanciera es de $ 32.0 \% \text{ E.A.}$.
* **Resolución Mecánica:**
  1. El `FinancialEngine` ejecuta la guarda `enforceUsuryCap(effectiveAnnualRate, maxUsuryRate)`.
  2. Detecta el exceso y trunca la tasa E.A. a exactamente la tasa de usura máxima permitida ($32.0 \%$).
  3. Recalcula el descuento comercial $D_{\text{total}}$ en centavos para que el costo asumido por el freelancer sea legalmente inatacable.

---

## 12. Escenario 12: Ataque de Fuerza Bruta contra Enlaces de Confirmación
* **Condición de Estrés:** Un atacante envía 50.000 peticiones por segundo probando tokens aleatorios en `/api/v1/milestones/{token}/confirm`.
* **Resolución Mecánica:**
  1. Los tokens de confirmación poseen **256 bits de entropía criptográfica** (`crypto.randomBytes(32).toString('hex')`). El espacio de búsqueda es de $2^{256}$, haciendo inviable cualquier colisión por fuerza bruta.
  2. Redis aplica rate-limiting por IP (máximo 10 intentos fallidos por minuto $\rightarrow$ bloqueo temporal de 1 hora).
  3. Tras 3 intentos fallidos sobre un mismo hito, el token se invalida y se genera uno nuevo despachado al correo verificado del pagador.

---

## 13. Escenario 13: Reinicio Abrupto del Worker Durante el Minteo On-Chain
* **Condición de Estrés:** El servidor del worker pierde energía en el instante exacto en que la transacción de minteo fue transmitida al mempool de Base.
* **Resolución Mecánica:**
  1. Al reiniciar, el worker lee los eventos en estado `PROCESSING`.
  2. Con el `idempotency_key`, consulta a la red Base mediante `eth_getTransactionByHash` o el nonce de la cuenta operadora.
  3. Si la transacción ya está en mempool o confirmada, espera el recibo y actualiza el outbox a `COMPLETED`. No retransmite ni duplica el minteo.

---

## 14. Escenario 14: Ejercicio de Derecho al Olvido con Operaciones Vivas
* **Condición de Estrés:** Un freelancer solicita la supresión total de sus datos conforme a la Ley 1581 de 2012 mientras tiene una operación activa fondeada en curso.
* **Resolución Mecánica:**
  1. La Ley 1581 de 2012 y el Decreto 1377 establecen que el deber de supresión no procede cuando exista un deber contractual o legal vigente.
  2. El sistema rechaza la solicitud de borrado inmediato y notifica al usuario que sus datos se mantendrán bloqueados hasta la liquidación total de la operación y el cumplimiento de las obligaciones fiscales (retención de 5 años por estatuto tributario).
  3. Una vez liquidada la operación, se ejecuta la anonimización de la información personal en base de datos sin afectar los registros contables disociados.

---

## 15. Escenario 15: Caída del Servicio RADIAN de la DIAN
* **Condición de Estrés:** La plataforma de la DIAN sufre una caída de 6 horas durante la cual el `InvoiceVerificationPort` no puede verificar los acuses de una factura electrónica.
* **Resolución Mecánica:**
  1. La operación permanece en estado `PENDING_VERIFICATION` con badge visual claro en la UI (*"Validando Factura ante DIAN..."*).
  2. El worker programa reintentos automáticos con retroceso exponencial sin marcar la factura como rechazada.
  3. El freelancer puede optar por cancelar la solicitud o esperar la respuesta sin penalidad alguna en su scoring de reputación.

