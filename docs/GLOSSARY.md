# Glosario de Términos — Proofly (`docs/GLOSSARY.md`)

Este glosario define el vocabulario ubicuo del dominio de **Proofly** para asegurar consistencia estricta entre la documentación de negocio, el código TypeScript, el esquema de base de datos, los contratos inteligentes y la interfaz de usuario.

---

## 1. Actores del Sistema

* **Freelancer (Profesional Independiente):** Persona natural o jurídica que presta servicios profesionales, técnicos o creativos y busca adelantar el cobro de sus ingresos futuros (facturas o hitos de contratos).
* **Financiador (Fondeador / Inversionista):** Persona o entidad que aporta capital líquido para fondear una o más operaciones, recibiendo a cambio el reembolso de su capital más una ganancia neta pactada al momento de la liquidación.
* **Empresa Contratante (Deudor / Pagador):** Entidad o persona jurídica receptora de los servicios del freelancer, obligada a pagar el valor nominal de la factura o hito en la fecha de vencimiento acordada.
* **Operador / Conciliador Proofly:** Rol interno de administración que valida recauos bancarios, gestiona incidentes y supervisa la conciliación entre la base de datos relacional y el ledger on-chain.

---

## 2. Instrumentos y Activos Financiables

* **Operación:** Unidad atómica de financiación en Proofly. Puede ser una **Factura Electrónica** (con eventos RADIAN) o un **Hito Contractual (Milestone)** derivado de una orden de trabajo o contrato de prestación de servicios.
* **Hito Contractual (Milestone):** Tramo de un proyecto profesional con entregables definidos y fecha límite, cuya aceptación por parte de la empresa contratante habilita la solicitud de adelanto antes de la facturación final.
* **Factura Electrónica:** Título valor regulado en Colombia (Ley 1231 de 2008, Decreto 1154 de 2020) con registro de eventos de recepción, recibo de mercancía/servicio y aceptación expresa o tácita.
* **Cesión de Derechos Económicos:** Acto jurídico electrónico vinculante mediante el cual el freelancer cede a la plataforma/financiadores el derecho a percibir el pago de la operación a cambio del desembolso anticipado.
* **Dossier Documental:** Conjunto comprimido y ordenado de evidencias (contrato, entregable, factura XML, aprobación del cliente) cuyo hash criptográfico se ancla on-chain.

---

## 3. Variables y Conceptos Financieros

* **Valor Nominal ($V_n$):** Monto total adeudado por la empresa contratante a la fecha de vencimiento, expresado en centavos de COP.
* **Adelanto Neto ($A$):** Capital líquido que recibe de forma inmediata el freelancer al momento de fondearse la operación ($A = V_n - \text{Descuento}$).
* **Descuento Comercial ($d$):** Descuento pactado sobre el valor nominal que remunera el costo del capital de los financiadores y el fee operativo de la plataforma.
* **Ganancia Neta del Financiador ($G_f$):** Rendimiento en COP que percibe el financiador al cumplirse el pago de la operación.
* **Comisión de Plataforma / Fee Proofly ($C_p$):** Porcentaje del valor nominal retenido por Proofly por estructuración, verificación, custodia y cobranza tecnológica.
* **Tasa Efectiva Anual (E.A.):** Tasa normalizada a 360 días que expresa el rendimiento anual equivalente para el financiador y el costo financiero para el solicitante.
* **Cascada de Recaudo (Waterfall):** Regla inmutable y determinista de distribución de fondos cuando la empresa paga:
  1. Reembolso de Capital + Ganancia pactada a los financiadores.
  2. Comisión de la plataforma (Fee Proofly).
  3. Remanente al freelancer (si aplica por liquidaciones especiales).
* **Algoritmo del Mayor Resto (*Largest Remainder Method*):** Método matemático de reparto entero para prorratear desembolsos, ganancias y pagos parciales entre múltiples financiadores sin perder un solo centavo por truncamiento.

---

## 4. Reputación, Scoring y Tiers

* **Tier Semilla (Nivel 1):** Nivel de entrada para cualquier freelancer verificado; permite financiar un primer hito/factura con cupo acotado (hasta $ 2.000.000 COP) y confirmación directa del contratante.
* **Tier Crecimiento (Nivel 2):** Nivel intermedio tras liquidar 2+ operaciones exitosas a tiempo, con mayor cupo y tasa de descuento reducida.
* **Tier Pro (Nivel 3):** Nivel avanzado para freelancers con historial impecable, habilitando desembolsos automáticos y múltiples hitos en paralelo.
* **Score de Ejecución (Freelancer):** Calificación basada en puntualidad histórica, portafolio y entregables completados.
* **Score de Solvencia (Empresa Contratante):** Calificación basada en historial de pago, antigüedad empresarial y reporte en centrales de riesgo.

---

## 5. Arquitectura Técnica y Web3

* **Base:** Capa 2 (L2) de Ethereum donde se despliegan los contratos de Proofly por su bajo costo de gas y alta velocidad. Entorno de pruebas: **Base Sepolia**; Entorno de producción: **Base Mainnet**.
* **`ProoflyKYCRegistry`:** Contrato inteligente encargado de la lista blanca de direcciones que han completado verificación de identidad y cumplimiento.
* **`ProoflyOperations` (ERC-1155):** Contrato que gestiona el ciclo de vida de cada operación tokenizada: registro del dossier hasheado, emisión de participaciones fraccionadas, recaudo y liquidación inmutable.
* **Clave Canónica Anti-Duplicado (HMAC):** Hash generado mediante `HMAC-SHA256(secret, payload)` que impide que una misma factura o hito sea financiado más de una vez.
* **Transactional Outbox:** Patrón arquitectónico que garantiza consistencia atómica entre la base de datos PostgreSQL y los eventos enviados a la blockchain mediante un worker asíncrono e idempotente.
* **Abstracción de Cuentas (Account Abstraction):** Mecanismo para que los usuarios operen sin custodiar frases semilla ni pagar gas directamente, realizando transacciones con confirmación Web2 nativa.

---

## 6. Sistema Visual y Diseño

* **Modo Claro Absoluto (Light Mode Only):** Mandato de diseño de Proofly donde toda la plataforma opera con fondos blancos y lavanda pastel, eliminando interfaces oscuras completas.
* **Tokens de Color Proofly:**
  * `#FFFFFF`: Fondo principal (Canvas).
  * `#F8D4FD`: Lavanda pastel para cards de métricas, onboarding y acentos suaves.
  * `#F6F5F8`: Gris sutil para inputs y selectores segmented.
  * `#7300FF`: Violeta eléctrico para acento primario de marca, enlaces y barras de progreso.
  * `#000000`: Negro puro para botones primarios (píldoras), títulos y banners de alto contraste.

