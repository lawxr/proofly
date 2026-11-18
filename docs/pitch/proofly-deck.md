# Proofly · Contenido para el deck semilla (plantilla YC)

Tres tipos de dato en este documento:
- **Dato público con fuente:** cifras del DANE y de la DIAN, citadas al final.
- **Dato del MVP:** sale del código y de la prueba en Ethereum Sepolia del 18-11-2026.
- **Meta / supuesto:** proyección del equipo para la presentación simulada. Va marcada con *(meta)* o *(supuesto)*.

---

## Las diez líneas

1. **Título:** Proofly adelanta el cobro de facturas a freelancers con capital de financiadores que ganan un retorno claro.
2. **Problema:** 9,6 millones de colombianos trabajan por cuenta propia, y quien factura a empresas espera de 30 a 90 días para cobrar.
3. **Solución:** el freelancer registra su factura, ve su anticipo exacto y recibe el dinero cuando los financiadores la fondean.
4. **Tracción:** el MVP corre de punta a punta; en el piloto la meta es 400 facturas financiadas al mes.
5. **Más métricas:** meta de $1.200 millones COP anticipados al mes y 70 % de financiadores que reinvierten.
6. **Insight:** nadie comparte un registro confiable de quién es dueño de cada cobro; Proofly lo registra on-chain, sin datos personales.
7. **Modelo de negocio:** 1 % de comisión por factura financiada.
8. **Mercado:** las facturas endosadas en RADIAN pasaron de $11,2 a $46,7 billones en 3 años, y nadie atiende al freelancer.
9. **Equipo:** fundadores que trabajan como freelancers y construyeron el MVP completo, contratos incluidos.
10. **El pedido:** levantamos US$ 350.000 para un piloto de 12 meses con 300 freelancers y 50 financiadores.

---

## Diapositiva 1 · Título

**Proofly**
Liquidez para freelancers. Retornos para financiadores.

Visual: logo Proofly sobre fondo blanco, título en negro y el acento en violeta `#7300FF`.

---

## Diapositiva 2 · Problema

**Un freelancer puede tener ingresos y no tener liquidez.**

- 9,6 millones de colombianos trabajan por cuenta propia: el 40,8 % de los ocupados (DANE, junio de 2025).
- Quien factura a una empresa espera de 30 a 90 días para cobrar *(supuesto, según plazos comerciales usuales)*.
- El banco lo rechaza por ingresos variables o porque tiene poco historial.

Historia para contar *(ejemplo ilustrativo)*: Laura es diseñadora en Medellín. Terminó un proyecto de $4.000.000 para una agencia que le paga a 60 días, y ese mes tiene que pagar arriendo y licencias.

---

## Diapositiva 3 · Solución

**Recibe hoy el valor de tu factura, menos un descuento claro.**

- Registras la factura o el hito y ves tu anticipo exacto antes de aceptar.
- Los financiadores eligen tu operación y la fondean.
- Cuando la empresa paga, Proofly reparte capital y ganancia automáticamente.

Números reales del motor del MVP (factura de $1.000.000 a 30 días):

| | |
|---|---|
| Valor de la factura | $1.000.000 |
| Descuento (2 % mensual) | −$20.000 |
| Comisión Proofly (1 %) | −$10.000 |
| **El freelancer recibe hoy** | **$970.000** |
| El financiador aporta / recibe | $970.000 / $990.000 |
| Retorno del financiador | 27,75 % E.A. |

---

## Diapositiva 4 · Tracción

**El MVP ya completa el ciclo de punta a punta.**

Lo que ya funciona *(dato del MVP)*:
- Crear factura → aceptar → invertir desde la wallet → fondeo completo → recaudo → retiro de capital + ganancia.
- Ciclo probado en red pública de pruebas, con transacciones verificables en Etherscan.
- En la prueba: se depositaron 97 y se retiraron 99, el capital más la ganancia exacta al centavo.

Metas del piloto: facturas financiadas por mes *(meta)*:

| Mes | 1 | 2 | 3 | 6 | 9 | 12 |
|---|---|---|---|---|---|---|
| Facturas | 10 | 25 | 50 | 120 | 250 | 400 |

En el gráfico, marque que la serie es la meta del piloto.

---

## Diapositiva 5 · Más métricas

Metas a 12 meses *(meta)*:

- **$1.200 millones COP** anticipados por mes (400 facturas × $3.000.000 de valor promedio).
- **70 %** de los financiadores vuelve a invertir después de su primera liquidación.
- **95 %** de las facturas pagadas a tiempo, con mora máxima del 5 %.
- **< 24 h** del registro de la factura al desembolso.
- **< 10 min** para registrar una solicitud.

---

## Diapositiva 6 · Insight

**Nadie comparte un registro confiable de quién es dueño de cada cobro.**

- La misma factura puede venderse dos veces, porque freelancer, empresa y financiadores llevan cada uno su propio registro.
- Proofly registra cada operación con una huella única (sin datos personales) y bloquea su segundo registro.
- Las participaciones son tokens que solo tienen wallets verificadas. El reparto lo hace un contrato al centavo y cualquiera puede auditarlo.

| Parte | Hoy no puede verificar | Con Proofly |
|---|---|---|
| Financiador | Si la factura ya se financió; cuánto le toca | Registro único, participación on-chain, reparto exacto |
| Freelancer | Cuánto le cobran en realidad | Descuento, comisión y tasa visibles antes de aceptar |
| Empresa | A quién le paga | Cuenta de recaudo única; Proofly distribuye |

Ventaja propia *(supuesto)*: los fundadores son freelancers, tienen acceso directo a comunidades de desarrolladores y diseñadores, y construyeron la integración con RADIAN para verificar facturas.

---

## Diapositiva 7 · Modelo de negocio

**Cobramos 1 % de cada factura financiada.**

- **Ingreso por operación:** 1 % del valor nominal. Factura promedio de $3.000.000 → $30.000 *(supuesto de ticket)*.
- **Costo por operación:** cerca de $12.000 (verificación KYC, consulta RADIAN, red y soporte) *(supuesto)*.
- **Margen por operación:** cerca de $18.000, el 60 % *(supuesto)*.

Cuando la empresa paga, el orden del reparto es:
1. Capital + ganancia del financiador.
2. Comisión Proofly.
3. Remanente para el freelancer.

Para crecer después:
- Suscripción para agencias: $49.000 al mes *(meta)*.
- Herramientas de cartera para empresas pagadoras.

---

## Diapositiva 8 · Mercado

**Las facturas negociadas crecieron más de cuatro veces en tres años, pero el freelancer sigue por fuera.**

- Facturas endosadas en RADIAN: **$11,2 billones (2022) → $46,7 billones (2025)**, +316 % (DIAN).
- Primer mercado *(supuesto)*: el 5 % de los 9,6 millones de independientes factura a empresas, es decir ≈ **480.000 freelancers**.

**480.000 freelancers × 6 facturas al año × $3.000.000 × 1 % = $86.400 millones COP al año**

Meta a 3 años *(meta)*: 10.000 freelancers activos = $1.800 millones COP de ingresos al año.
Expansión: hitos de proyecto antes de la factura final, después pymes y luego otros países de la región.

---

## Diapositiva 9 · Equipo

**Somos freelancers y construimos sistemas financieros.**

- **Sebastián M. · CTO:** construyó solo el MVP completo: app web, backend, contratos inteligentes y la integración on-chain con pagos verificables.
- **[Cofundador/a] · CEO:** [N] años como freelancer; conoce de primera mano la espera de 60 días para cobrar.
- **[Cofundador/a] · Producto y riesgo:** experiencia en análisis de crédito y en factoring.

*(Reemplace los nombres y la experiencia con los del equipo real. Solo van fundadores, sin asesores.)*

---

## Diapositiva 10 · El pedido

**Levantamos US$ 350.000**

- **Para:** 3 ingenieros, auditoría de los contratos, la estructura legal con un factor habilitado, y KYC y pagos PSE/ACH reales.
- **En 12 meses:** 300 freelancers y 50 financiadores activos, 400 facturas al mes y $1.200 millones COP anticipados al mes.

Uso de los fondos *(meta)*:
- 55 % equipo.
- 15 % legal y cumplimiento.
- 10 % auditoría de seguridad.
- 20 % adquisición de usuarios del piloto.

---

## Anexo A · Qué es real en el MVP y qué es simulado

| Componente | Estado |
|---|---|
| Registro, inicio de sesión, verificación de identidad, vinculación de wallet | Funciona (KYC simulado) |
| Crear factura o hito, cotización, aceptación | Funciona |
| Validación de la factura en DIAN/RADIAN | Simulada |
| Invertir desde MetaMask, liquidar, retirar capital + ganancia | Funciona en red de pruebas |
| Dinero | Token de prueba sin valor (1 mUSDC = 4.000 COP, tasa demo) |
| Desembolso al freelancer y pago de la empresa | Simulados |

## Anexo B · Arquitectura

- **Stack:** React + Vite · Node.js + TypeScript (arquitectura hexagonal) · PostgreSQL · worker con outbox · contratos Solidity (ERC-1155, KYC, vault).
- **Dinero en enteros:** centavos COP, nunca decimales flotantes. Con varios financiadores, el reparto se hace por el método del mayor resto.
- **Privacidad:** on-chain no va ningún dato personal.
- **Calidad:** 88 pruebas automáticas de la aplicación y 46 del contrato, todas en verde.
- **Contratos (Ethereum Sepolia):**
  - Operaciones: `0xdA03f2AfBeB77a47843466252e04d7dA284DaBA3`
  - KYC: `0x407B83F792895E2d88B8b96e1A640b0Fa3A2De11`
  - mUSDC: `0x776991CA67ec0DAb8907FD84d08143BcA2050C0b`

## Anexo C · Riesgos y cómo los mitigamos

| Riesgo | Mitigación |
|---|---|
| La empresa no paga | Puntaje separado de freelancer y pagador; límites por pagador; cupo progresivo |
| Regulatorio | Operar el piloto con un factor o fiduciaria habilitada |
| Doble financiación en otra plataforma | Verificación de la factura en RADIAN antes de abrir la operación |
| Fallas del contrato | Auditoría externa antes de manejar dinero real |

## Fuentes de los datos públicos

- DANE vía El Colombiano (ago. 2025): 9,6 millones de trabajadores por cuenta propia, el 40,8 % de los ocupados. [Enlace](https://www.elcolombiano.com/negocios/empleo-informal-trabajo-por-cuenta-propia-crece-en-colombia-GK28551513)
- DIAN vía Valora Analitik y Portafolio (2026): facturas endosadas en RADIAN, de $11,23 billones en 2022 a $46,7 billones en 2025; $37,1 billones entre enero y julio de 2026. [Valora Analitik](https://www.valoraanalitik.com/factoring-sigue-creciendo-en-colombia-lulo/) · [Portafolio](https://www.portafolio.co/tecnologia/el-factoring-gana-terreno-en-colombia-las-facturas-endosadas-en-radian-suman-37-1-billones-a-julio-de-504996)

## Guía de diseño

- Una idea por diapositiva, letra grande y en negrita.
- Paleta Proofly: blanco `#FFFFFF`, lavanda `#F8D4FD`, negro `#000000`, violeta `#7300FF`, verde de ganancia `#16A34A`.
- Montos con formato COP: `$ 970.000`.
- La palabra "blockchain" aparece solo en la diapositiva 6.
