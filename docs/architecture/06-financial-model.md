# Modelo Financiero y de Rendimientos — Proofly (`docs/architecture/06-financial-model.md`)

Este documento define la especificación matemática, fórmulas formales, algoritmos de cálculo entero y escenarios numéricos verificados del motor financiero (`FinancialEngine`) de **Proofly**, dando estricto cumplimiento a la **Invariante I1 (COP)**, **Invariante I4 (Transparencia de Retornos)**, **Invariante I9 (Exactitud Aritmética)** e **Invariante I10 (Waterfall)**.

---

## 1. Definición Formal de Variables

Todas las cantidades monetarias se operan en **centavos de peso colombiano (COP)** como enteros sin signo de 64 bits (`bigint` en TypeScript, `uint256` en Solidity).

| Símbolo | Variable | Unidad | Descripción |
| :---: | :--- | :---: | :--- |
| $V_n$ | **Valor Nominal** | Centavos COP | Monto total a pagar por la empresa contratante al vencimiento. |
| $n$ | **Plazo en Días** | Días enteros | Días naturales entre la fecha de fondeo y la fecha de vencimiento ($15 \le n \le 90$). |
| $r_m$ | **Tasa de Descuento Mensual** | Decimal | Tasa base comercial mensual pactada para el periodo de 30 días ($0.010 \le r_m \le 0.025$). |
| $d$ | **Tasa de Descuento del Periodo** | Decimal | $d = r_m \times \frac{n}{30}$. |
| $D_{\text{total}}$ | **Descuento Comercial Total** | Centavos COP | Deducción sobre el valor nominal que remunera a los financiadores ($D_{\text{total}} = \lfloor V_n \times d \rfloor$). |
| $f_{\text{proofly}}$ | **Comisión de Plataforma** | Decimal | Fee operativo de Proofly por originación y recaudo ($0.010$ a $0.015$, es decir, 1.0 % a 1.5 % de $V_n$). |
| $C_p$ | **Fee de Proofly en COP** | Centavos COP | $C_p = \lfloor V_n \times f_{\text{proofly}} \rfloor$. |
| $A$ | **Adelanto Neto al Freelancer** | Centavos COP | Capital líquido transferido al freelancer ($A = V_n - D_{\text{total}} - C_p$). |
| $K$ | **Capital Financiado Total** | Centavos COP | Capital aportado por los financiadores en el marketplace ($K = V_n - D_{\text{total}} = A + C_p$). |
| $G_f$ | **Ganancia Neta Financiadores** | Centavos COP | Rendimiento financiero bruto obtenido por los financiadores ($G_f = V_n - K = D_{\text{total}}$). |
| $E.A.$ | **Tasa Efectiva Anual** | Porcentaje | Rentabilidad anual compuesta equivalente para el financiador normalizada a 360 días. |

---

## 2. Fórmulas Matemáticas del Motor

### 2.1. Adelanto Neto al Freelancer ($A$)
$$A = V_n - \lfloor V_n \times d \rfloor - \lfloor V_n \times f_{\text{proofly}} \rfloor$$

### 2.2. Ganancia Neta de los Financiadores ($G_f$)
$$G_f = \lfloor V_n \times d \rfloor$$

### 2.3. Tasa Efectiva Anual (E.A.) para el Financiador
Dado que el financiador aporta un capital $K$ y recibe $V_n$ al cabo de $n$ días:
$$\text{Retorno del Periodo } (R) = \frac{V_n - K}{K} = \frac{G_f}{K}$$

$$\text{Tasa E.A.} = \left( 1 + \frac{G_f}{K} \right)^{\frac{360}{n}} - 1$$

---

## 3. Escalonamiento de Tasas según Score Combinado

El Score Combinado ($S_{\text{comb}} \in [0, 100]$) se calcula como la media ponderada entre el Score de Ejecución del Freelancer ($S_{\text{free}}$) y el Score de Solvencia de la Empresa Contratante ($S_{\text{emp}}$):

$$S_{\text{comb}} = 0.40 \times S_{\text{free}} + 0.60 \times S_{\text{emp}}$$

| Rango de Score | Nivel de Riesgo | Tasa Mensual ($r_m$) | Rango E.A. Estimada (30 días) | Cupo Máximo Permitido |
| :---: | :---: | :---: | :---: | :---: |
| **85 – 100 (Tier 3)** | Bajo Riesgo (Excelente) | **1.20 % – 1.50 %** | $15.4 \% – 19.6 \%$ E.A. | Hasta $ 25.000.000 COP |
| **70 – 84 (Tier 2)** | Riesgo Moderado | **1.60 % – 1.95 %** | $21.0 \% – 26.2 \%$ E.A. | Hasta $ 8.000.000 COP |
| **50 – 69 (Tier 1)** | Riesgo Aceptable (Semilla) | **2.00 % – 2.30 %** | $26.9 \% – 31.4 \%$ E.A. | Hasta $ 2.000.000 COP |
| **< 50** | No Elegible | — | — | $0 COP (Rechazada) |

*Nota Regulatoria:* La tasa E.A. resultante se compara siempre contra la tasa de usura vigente en Colombia (Superfinanciera). Si la supera, se trunca automáticamente al tope legal.

---

## 4. Algoritmo del Mayor Resto (Largest Remainder Method)

Cuando múltiples financiadores aportan fracciones de capital a una misma operación, o cuando se recibe un pago parcial, la distribución de centavos enteros mediante división truncada genera un residuo de redondeo ($R_{\text{centavos}} = \text{Total} - \sum \lfloor \text{cuotas} \rfloor$). 

Para que **no se pierda ni un solo centavo**, el motor financiero aplica el Algoritmo del Mayor Resto (Hamilton-Hare):
1. Se calcula la cuota exacta con decimales de cada participante: $q_i = \text{Total} \times \frac{K_i}{K_{\text{total}}}$.
2. Se asigna la parte entera: $p_i = \lfloor q_i \rfloor$.
3. Se calcula el residuo decimal de cada participante: $r_i = q_i - p_i$.
4. Se calcula el número de centavos sobrantes: $S = \text{Total} - \sum p_i$.
5. Se ordenan los participantes de mayor a menor residuo $r_i$ y se le suma $1 \text{ centavo}$ a los primeros $S$ participantes.

```typescript
export interface ShareAllocation {
  id: string;
  exactShare: number;
  allocatedCents: bigint;
}

export function allocateWithLargestRemainder(
  totalCents: bigint,
  weights: Array<{ id: string; weight: bigint }>
): ShareAllocation[] {
  const sumWeights = weights.reduce((acc, w) => acc + w.weight, 0n);
  if (sumWeights === 0n) throw new Error('Weight sum cannot be zero');

  let allocatedSum = 0n;
  const intermediate = weights.map(w => {
    const exact = (Number(w.weight) / Number(sumWeights)) * Number(totalCents);
    const baseCents = BigInt(Math.floor(exact));
    allocatedSum += baseCents;
    return {
      id: w.id,
      exact,
      baseCents,
      remainder: exact - Math.floor(exact)
    };
  });

  let remainderCents = totalCents - allocatedSum;

  // Ordenar de mayor a menor residuo
  intermediate.sort((a, b) => b.remainder - a.remainder);

  return intermediate.map((item, index) => {
    const extraCent = index < Number(remainderCents) ? 1n : 0n;
    return {
      id: item.id,
      exactShare: item.exact,
      allocatedCents: item.baseCents + extraCent
    };
  });
}
```

---

## 5. Los 6 Escenarios Numéricos Completamente Resueltos

### Escenario 1: Freelancer Tier 1 — Hito Corto de 15 Días (1 Financiador)
* **Valor Nominal ($V_n$):** `$ 1.000.000 COP` ($100.000.000 \text{ centavos}$)
* **Plazo ($n$):** 15 días. Tasa mensual: $2.10 \%$ ($0.0210$).
* **Descuento del Periodo ($d$):** $0.0210 \times \frac{15}{30} = 0.0105$ ($1.05 \%$).
* **Descuento Comercial ($G_f$):** $\lfloor 1.000.000 \times 0.0105 \rfloor =$ **`$ 10.500 COP`** ($1.050.000 \text{ centavos}$).
* **Fee Proofly ($C_p$ — 1.0%):** $\lfloor 1.000.000 \times 0.0100 \rfloor =$ **`$ 10.000 COP`** ($1.000.000 \text{ centavos}$).
* **Adelanto Neto al Freelancer ($A$):** $1.000.000 - 10.500 - 10.000 =$ **`$ 979.500 COP`**.
* **Capital Financiado ($K$):** $1.000.000 - 10.500 =$ **`$ 989.500 COP`**.
* **Retorno Financiador:** Aporta `$ 989.500 COP` y recibe `$ 1.000.000 COP` en 15 días (Ganancia neta: **`+$ 10.500 COP`**).
* **Tasa E.A. Financiador:** $\left(1 + \frac{10.500}{989.500}\right)^{\frac{360}{15}} - 1 = (1.010611)^{24} - 1 =$ **`28.75 % E.A.`**

---

### Escenario 2: Freelancer Tier 1 — Hito de 30 Días (2 Financiadores: 60% y 40%)
* **Valor Nominal ($V_n$):** `$ 2.000.000 COP` ($200.000.000 \text{ centavos}$)
* **Plazo ($n$):** 30 días. Tasa mensual: $2.00 \%$ ($d = 0.0200$).
* **Descuento Comercial ($G_f$):** `$ 40.000 COP` ($4.000.000 \text{ centavos}$).
* **Fee Proofly ($C_p$ — 1.0%):** `$ 20.000 COP` ($2.000.000 \text{ centavos}$).
* **Adelanto Neto al Freelancer ($A$):** `$ 1.940.000 COP`.
* **Capital Total Financiado ($K$):** `$ 1.960.000 COP`.
* **Distribución de Aportes y Ganancias:**
  * **Financiador 1 (60%):** Aporta `$ 1.176.000 COP`. Al vencimiento recibe **`$ 1.200.000 COP`** (Ganancia neta: **`+$ 24.000 COP`**).
  * **Financiador 2 (40%):** Aporta `$ 784.000 COP`. Al vencimiento recibe **`$ 800.000 COP`** (Ganancia neta: **`+$ 16.000 COP`**).
* **Tasa E.A.:** $\left(1 + \frac{40.000}{1.960.000}\right)^{12} - 1 = (1.020408)^{12} - 1 =$ **`27.42 % E.A.`**

---

### Escenario 3: Freelancer Tier 2 — Factura de 30 Días (3 Financiadores: 50%, 30%, 20%)
* **Valor Nominal ($V_n$):** `$ 5.000.000 COP` ($500.000.000 \text{ centavos}$)
* **Plazo ($n$):** 30 días. Tasa mensual: $1.75 \%$ ($d = 0.0175$).
* **Descuento Comercial ($G_f$):** `$ 87.500 COP` ($8.750.000 \text{ centavos}$).
* **Fee Proofly ($C_p$ — 1.0%):** `$ 50.000 COP` ($5.000.000 \text{ centavos}$).
* **Adelanto Neto al Freelancer ($A$):** `$ 4.862.500 COP`.
* **Capital Total Financiado ($K$):** `$ 4.912.500 COP`.
* **Distribución:**
  * **Financiador A (50%):** Aporta `$ 2.456.250 COP` $\rightarrow$ Recibe **`$ 2.500.000 COP`** (Ganancia: **`+$ 43.750 COP`**).
  * **Financiador B (30%):** Aporta `$ 1.473.750 COP` $\rightarrow$ Recibe **`$ 1.500.000 COP`** (Ganancia: **`+$ 26.250 COP`**).
  * **Financiador C (20%):** Aporta `$ 982.500 COP` $\rightarrow$ Recibe **`$ 1.000.000 COP`** (Ganancia: **`+$ 17.500 COP`**).
* **Tasa E.A.:** **`23.63 % E.A.`**

---

### Escenario 4: Freelancer Tier 2 — Hito de 45 Días (5 Financiadores Asimétricos)
* **Valor Nominal ($V_n$):** `$ 7.500.000 COP` ($750.000.000 \text{ centavos}$)
* **Plazo ($n$):** 45 días. Tasa mensual: $1.70 \%$ $\rightarrow d = 0.0170 \times \frac{45}{30} = 0.0255$ ($2.55 \%$).
* **Descuento Comercial ($G_f$):** $\lfloor 7.500.000 \times 0.0255 \rfloor =$ **`$ 191.250 COP`**.
* **Fee Proofly ($C_p$ — 1.2%):** $\lfloor 7.500.000 \times 0.0120 \rfloor =$ **`$ 90.000 COP`**.
* **Adelanto Neto al Freelancer ($A$):** `$ 7.218.750 COP`.
* **Capital Total Financiado ($K$):** `$ 7.308.750 COP`.
* **Aportes Asimétricos de 5 Financiadores:**
  * F1 ($2.000.000$ nominal): Aporta `$ 1.949.000 COP` $\rightarrow$ Recibe **`$ 2.000.000 COP`** (Ganancia: **`+$ 51.000 COP`**).
  * F2 ($2.000.000$ nominal): Aporta `$ 1.949.000 COP` $\rightarrow$ Recibe **`$ 2.000.000 COP`** (Ganancia: **`+$ 51.000 COP`**).
  * F3 ($1.500.000$ nominal): Aporta `$ 1.461.750 COP` $\rightarrow$ Recibe **`$ 1.500.000 COP`** (Ganancia: **`+$ 38.250 COP`**).
  * F4 ($1.000.000$ nominal): Aporta `$ 974.500 COP` $\rightarrow$ Recibe **`$ 1.000.000 COP`** (Ganancia: **`+$ 25.500 COP`**).
  * F5 ($1.000.000$ nominal): Aporta `$ 974.500 COP` $\rightarrow$ Recibe **`$ 1.000.000 COP`** (Ganancia: **`+$ 25.500 COP`**).
  * **Suma total recibida:** Exactamente `$ 7.500.000 COP` ($0 centavos de residuo$).
* **Tasa E.A.:** $\left(1 + \frac{191.250}{7.308.750}\right)^{\frac{360}{45}} - 1 = (1.026167)^8 - 1 =$ **`22.99 % E.A.`**

---

### Escenario 5: Freelancer Tier 3 — Factura Corporativa de 60 Días ($ 15.000.000 COP)
* **Valor Nominal ($V_n$):** `$ 15.000.000 COP` ($1.500.000.000 \text{ centavos}$)
* **Plazo ($n$):** 60 días. Tasa mensual: $1.30 \%$ (Tier 3 Pro) $\rightarrow d = 0.0130 \times \frac{60}{30} = 0.0260$ ($2.60 \%$).
* **Descuento Comercial ($G_f$):** $\lfloor 15.000.000 \times 0.0260 \rfloor =$ **`$ 390.000 COP`**.
* **Fee Proofly ($C_p$ — 1.0%):** `$ 150.000 COP`.
* **Adelanto Neto al Freelancer ($A$):** `$ 14.460.000 COP`.
* **Capital Total Financiado ($K$):** `$ 14.610.000 COP`.
* **Retorno Financiadores:** Recuperan `$ 14.610.000 COP` + ganan neto **`+$ 390.000 COP`** en 60 días.
* **Tasa E.A.:** $\left(1 + \frac{390.000}{14.610.000}\right)^6 - 1 = (1.026694)^6 - 1 =$ **`17.07 % E.A.`**

---

### Escenario 6: Caso Crítico de Pago Parcial (60%) con 3 Financiadores Iguales (Mayor Resto)
* **Valor Nominal Original ($V_n$):** `$ 10.000.000 COP` ($1.000.000.000 \text{ centavos}$) a 30 días con $d = 0.0180$.
* **Capital Financiado ($K$):** `$ 9.820.000 COP` ($982.000.000 \text{ centavos}$).
* **Financiadores:** 3 financiadores con participaciones idénticas ($1/3$ cada uno $= 33.333333\%$).
* **Situación:** Al vencimiento, la empresa abona únicamente el **60 %**:
  $$\text{Recaudo Real } = \mathbf{\$ 6.000.000 \text{ COP}} \quad (600.000.000 \text{ centavos})$$
* **Regla de Cascada (Invariante I10):** Se prioriza la devolución de capital aportado a los financiadores antes de cobrar comisiones de plataforma.
* **Reparto con Algoritmo del Mayor Resto sobre $600.000.000 \text{ centavos}$:**
  * Cuota exacta: $600.000.000 / 3 = 200.000.000,00 \text{ centavos}$.
  * Cada financiador recibe exactamente: **`$ 2.000.000 COP`** ($200.000.000 \text{ centavos}$).
  * **Saldo insoluto pendiente de cobro:** `$ 4.000.000 COP` pasa al estado `PARTIALLY_SETTLED_OVERDUE` para gestión de cobranza y mora sobre el remanente.
  * **Verificación de Invariante:** $\sum \text{Partes} = 2.000.000 + 2.000.000 + 2.000.000 = \$ 6.000.000 \text{ COP}$ exactos ($0 centavos de error$).

