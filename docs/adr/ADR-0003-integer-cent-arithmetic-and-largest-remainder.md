# ADR-0003: Aritmética Entera en Centavos y Algoritmo del Mayor Resto (Hamilton-Hare)

* **Estado:** Aprobado
* **Fecha:** 2026-11-07
* **Contexto Técnico:** Precisión Contable y Cascada de Liquidación (Waterfall)

---

## Contexto y Planteamiento del Problema
El uso de números de punto flotante (`number` en JavaScript / `IEEE 754`) genera imprecisiones acumulativas (ej. `0.1 + 0.2 !== 0.3`). En un protocolo fintech donde múltiples financiadores aportan fracciones de capital y donde los pagos parciales deben liquidarse con exactitud legal, el truncamiento o redondeo convencional genera pérdidas o excesos de centavos, violando la Invariante I9 e Invariante I10.

## Opciones Consideradas
1. **Punto flotante tradicional (`number` / `float8`) con redondeo a 2 decimales (`Math.round`).**
2. **Librerías de alta precisión decimal (ej. `bignumber.js`) almacenando strings en BD.**
3. **Aritmética entera estricta en centavos de COP (`bigint` / `uint256`) con Algoritmo del Mayor Resto (Hamilton-Hare).**

## Decisión Tomada
Se elige la **Opción 3**:
- Todo monto monetario se expresa en centavos de COP como enteros (`bigint` en TypeScript, `BIGINT` en PostgreSQL, `uint256` en Solidity).
- La distribución pro-rata de fondos entre financiadores y la liquidación de pagos parciales se efectúa mediante el **Algoritmo del Mayor Resto (*Largest Remainder Method*)**, garantizando matemáticamente que $\sum \text{cuotas} \equiv \text{total}$.
- El formateo visual (`$ 1.500.000 COP`) queda restringido exclusivamente a los componentes de presentación en la UI.

## Consecuencias
* **Positivas:**
  * Cero discrepancias contables en auditorías y conciliaciones diarias.
  * Compatibilidad nativa sin conversiones complejas entre TypeScript (`bigint`) y Solidity (`uint256`).
* **Negativas:**
  * Obliga a escribir funciones auxiliares de serialización JSON para tipos `bigint`.

