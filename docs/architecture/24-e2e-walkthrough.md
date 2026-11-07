# Recorrido E2E sobre Papel con Cifras Reales — Proofly (`docs/architecture/24-e2e-walkthrough.md`)

Este documento presenta una auditoría paso a paso del ciclo de vida completo de una operación en **Proofly**, demostrando la trazabilidad matemática, contable y on-chain con cifras exactas expresadas en centavos de COP.

---

## 1. Ficha Técnica de la Operación

| Parámetro | Valor de Negocio | Representación en Centavos (`bigint`) |
| :--- | :--- | :--- |
| **Operación** | Hito 1: *Desarrollo Frontend Mobile & Web App* | ID: `op_77492c1a-8b1e-4512-bc78-9e5631245a01` |
| **Freelancer** | Carlos Mendoza (Tier 1 Semilla · Score 72/100) | Wallet: `0x1111111111111111111111111111111111111111` |
| **Empresa Pagadora**| Estudio Creativo Andina S.A.S. (NIT 901.456.789 · Score 80) | Contacto: `facturacion@andina.co` |
| **Valor Nominal ($V_n$)**| **$ 2.000.000 COP** | **`200000000 centavos`** |
| **Plazo ($n$)** | 30 días naturales (Vencimiento: 2026-12-07) | $n = 30$ |
| **Tasa Mensual ($r_m$)**| $2.00 \%$ mensual ($0.0200$) | Descuento del periodo: $d = 2.00 \%$ |
| **Descuento ($D_{\text{total}}$)**| **$ 40.000 COP** | **`4000000 centavos`** |
| **Fee Proofly ($C_p$)** | **$ 20.000 COP** (1.0 % del nominal) | **`2000000 centavos`** |
| **Adelanto Neto ($A$)**| **$ 1.940.000 COP** ($V_n - D_{\text{total}} - C_p$) | **`194000000 centavos`** |
| **Capital Total ($K$)**| **$ 1.960.000 COP** ($A + C_p$) | **`196000000 centavos`** |
| **Tasa E.A. Financiador**| **`27.42 % E.A.`** | $\left(1 + \frac{40.000}{1.960.000}\right)^{12} - 1$ |

---

## 2. Traza Paso a Paso del Recorrido E2E

### Paso 1: Onboarding y Asignación de Cupo Tier 1
* Carlos completa su registro y sube su cédula colombiana.
* El `KycPort` verifica antecedentes en listas SARLAFT/OFAC (Aprobado).
* Se crea el registro en `freelancer_profiles` con `tier = 'TIER_1_SEED'` y `available_quota_cents = 200000000` ($ 2.000.000 COP).
* Se le asigna su billetera abstraída de Base L2 patrocinada por la plataforma.

### Paso 2: Creación del Hito y Generación de HMAC Canónico
* Carlos registra el hito: entregable URL en Figma, valor nominal de $ 2.000.000 COP y fecha de entrega.
* El `AntiDuplicateService` genera la clave canónica:
  $$\text{Payload} = \text{"c4a8d09f-67bc-4f81-9b1b-5f1234567890|1|901456789|200000000|1798761600"}$$
  $$\text{HMAC} = \text{HMAC-SHA256}(\text{ServerSecret}, \text{Payload}) = \text{"d8e4f1a2...7c9b"}$$
* Se inserta en la tabla `operations` con estado `PENDING_CLIENT_CONFIRMATION`.

### Paso 3: Confirmación sin Fricción de la Empresa Contratante
* El representante de Estudio Creativo Andina S.A.S. recibe un correo con el enlace seguro `https://proofly.co/verify/tok_sec_99a8b7c6`.
* Revisa el entregable y presiona **"Confirmar Hito y Compromiso de Pago"**.
* La API valida el token, marca `milestone_details.confirmed_by_client_at = NOW()` y transiciona la operación a `QUOTED`.

### Paso 4: Aceptación de Oferta y Firma de Cesión
* Carlos visualiza su cotización transparente en la app:  
  **Recibes hoy: `$ 1.940.000 COP`** · Costo total financiamiento: `$ 60.000 COP`.
* Carlos firma electrónicamente la cesión de derechos económicos.
* La operación avanza al estado `APPROVED_PENDING_FUNDING` y se publica en el Marketplace.

### Paso 5: Fondeo Fraccionado por 2 Financiadores
* **Financiador A (Ana Gómez):**
  - Aporta el 60 % del capital: **`$ 1.176.000 COP`** (`117600000 centavos`).
  - Nominal a recibir al vencimiento: **`$ 1.200.000 COP`** (`120000000 centavos`).
  - Ganancia neta pactada: **`+$ 24.000 COP`** (`2400000 centavos`).
* **Financiador B (David Ramos):**
  - Aporta el 40 % del capital: **`$ 784.000 COP`** (`78400000 centavos`).
  - Nominal a recibir al vencimiento: **`$ 800.000 COP`** (`80000000 centavos`).
  - Ganancia neta pactada: **`+$ 16.000 COP`** (`1600000 centavos`).
* **Total Fondeado:** $\$ 1.176.000 + \$ 784.000 = \mathbf{\$ 1.960.000 \text{ COP}}$ ($100 \%$ completado).
* La operación cambia de estado a `ACTIVE_FUNDED`. Se encola el evento en `outbox_events`.

### Paso 6: Emisión On-Chain (Base L2)
* El Worker de Outbox procesa el evento y ejecuta `mintOperation` en `ProoflyOperations.sol`:
  - `tokenId`: 42.
  - `nominalAmountCents`: 200000000.
  - `financiers`: `[address(Ana), address(David)]`.
  - `shares`: `[120000000, 80000000]`.
* Transacción confirmada en Base con hash `0x88f9...3a1c`. Se emiten los tokens ERC-1155.

### Paso 7: Desembolso Inmediato al Freelancer
* Confirmado el minteo on-chain, el `PaymentRailPort` ordena la transferencia bancaria ACH/Transfiya.
* La cuenta bancaria de Carlos recibe **`$ 1.940.000 COP`** con referencia bancaria `TRANSF-88741`.
* Estado de la operación: `DISBURSED`.

### Paso 8: Recaudo Bancario al Vencimiento (Día 30)
* En la fecha de vencimiento, Estudio Creativo Andina S.A.S. transfiere el 100 % del valor nominal (**`$ 2.000.000 COP`**) a la cuenta fiduciaria de recaudo de Proofly.
* El extracto bancario reporta el abono con referencia única `REC-994821`.
* El operador concilia el pago en el panel de control.

### Paso 9: Ejecución de la Cascada de Pagos (Waterfall)
El `FinancialEngine` aplica la distribución inmutable en enteros:
1. **Prioridad 1 (Financiadores):**
   - Ana Gómez recibe en su balance disponible: **`$ 1.200.000 COP`** (recupera sus `$ 1.176.000` de capital aportado $+$ **`$ 24.000`** de ganancia neta).
   - David Ramos recibe en su balance disponible: **`$ 800.000 COP`** (recupera sus `$ 784.000` de capital aportado $+$ **`$ 16.000`** de ganancia neta).
2. **Prioridad 2 (Fee de Plataforma Proofly):**
   - Proofly retiene su comisión operativa: **`$ 20.000 COP`**.
3. **Prioridad 3 (Remanente al Freelancer):**
   - `$ 0 COP` (la operación liquidó exactamente al 100 % del nominal).

$$\text{Balance de Cuadre: } \$ 1.200.000 + \$ 800.000 + \$ 20.000 = \mathbf{\$ 2.000.000 \text{ COP}} \quad (\text{Error: } 0 \text{ centavos})$$

### Paso 10: Liquidación On-Chain y Ascenso de Reputación
* El worker despacha `settleOperation(tokenId=42, proofHash=hashExtracto, settledAmount=200000000)` a Base.
* Los tokens de Ana y David se marcan como liquidados (`Settled`).
* La operación pasa a `SETTLED` en PostgreSQL.
* El Score de Carlos se incrementa: `successful_operations_count = 1`, `execution_score = 78/100`, quedando a una operación de ascender a **Tier 2 (Crecimiento)** con cupo de hasta $ 8.000.000 COP.

