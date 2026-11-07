# Especificación de Requisitos del Sistema — Proofly (`docs/00-contexto/requirements.md`)

Este documento consolida la extracción formal de requisitos de **Proofly**, trazados directamente a las fuentes de verdad del proyecto:
- `docs/fuentes/informe-proyecto.md` (Marco legal, modelo de negocio, riesgos y mitigaciones).
- `docs/fuentes/DESIGN.md` (Sistema visual, UI/UX mobile fintech y Light Mode).
- `docs/fuentes/enfoque-proofly.md` (Enfoque vigente de liquidez para freelancers y ganancias para financiadores).

---

## 1. Requisitos Funcionales (RF)

### 1.1. Módulo de Identidad y Onboarding (Freelancers y Financiadores)
* **RF-01 (Registro y Autenticación):** El sistema debe permitir el registro de freelancers y financiadores mediante correo electrónico y autenticación sin contraseña (magic link / OTP) o credenciales seguras, abstrayendo la creación de llaves criptográficas.
* **RF-02 (KYC/AML Automatizado):** El sistema debe validar la identidad del usuario contra listas restrictivas (SARLAFT/OFAC) y verificar documento de identidad (cédula de ciudadanía o extranjería) mediante un puerto de KYC (`KycPort`).
* **RF-03 (Perfil Profesional del Freelancer):** El freelancer debe poder conectar sus perfiles profesionales y portafolios (GitHub, Behance, LinkedIn o contratos históricos) como soporte de reputación.
* **RF-04 (Asignación de Nivel de Cupo Inicial):** El motor debe asignar a todo freelancer validado un **Tier Semilla (Nivel 1)** con un cupo inicial parametrizado (hasta $ 2.000.000 COP) sin exigir historial financiero previo en la plataforma.

### 1.2. Módulo de Originación (Facturas e Hitos Contractuales)
* **RF-05 (Carga de Factura Electrónica):** El sistema debe permitir al freelancer subir el archivo XML (UBL 2.1) de una factura electrónica y verificar su estado y acuses obligatorios ante la DIAN/RADIAN mediante `InvoiceVerificationPort`.
* **RF-06 (Creación de Proyecto por Hitos):** El sistema debe permitir al freelancer registrar un contrato o propuesta de trabajo, definiendo tramos o hitos (*milestones*) con entregable verificable, monto nominal en COP y fecha estimada de entrega.
* **RF-07 (Confirmación del Cliente / Empresa Contratante):** Para contratos por hitos y facturas, el sistema debe generar un enlace seguro y único (`MilestoneConfirmationPort`) para que la empresa contratante confirme la entrega o acepte el hito con un solo toque, sin requerir registro previo complejo.
* **RF-08 (Generación de Clave Única Anti-Duplicado):** Toda operación (factura o hito) debe generar un identificador canónico mediante `HMAC-SHA256(server_secret, payload)` para garantizar que no pueda registrarse ni financiarse dos veces en base de datos ni on-chain.
* **RF-09 (Simulación de Oferta para el Freelancer):** Al registrar una operación elegible, el sistema debe calcular de inmediato el monto neto a recibir hoy, el descuento comercial total, la comisión de Proofly y el plazo en días, requiriendo confirmación expresa del freelancer.
* **RF-10 (Cesión Electrónica de Derechos):** Antes de abrir la operación a fondeo, el freelancer debe firmar electrónicamente el contrato de cesión de derechos económicos sobre los flujos de la factura o hito.

### 1.3. Módulo de Marketplace y Fondeo (Financiadores)
* **RF-11 (Marketplace de Operaciones):** El sistema debe listar las operaciones disponibles para financiación, mostrando:
  - Nombre / referencia ficticia u opaca de la operación.
  - Score de Ejecución del Freelancer y Score de Solvencia de la Empresa.
  - Valor nominal total, plazo en días y fecha de vencimiento.
  - Tasa de retorno neta en COP y Tasa Efectiva Anual (E.A.) para el financiador.
  - Porcentaje fondeado y monto restante disponible.
* **RF-12 (Simulador de Participación en Tiempo Real):** El financiador debe poder ingresar el monto que desea aportar y ver en tiempo real: capital aportado, ganancia neta en COP al vencimiento y retorno total a liquidar.
* **RF-13 (Compra de Participaciones Fraccionadas):** Los financiadores pueden adquirir participaciones de una operación (desde $ 50.000 COP hasta el 100 % del monto disponible).
* **RF-14 (Cierre de Fondeo y Emisión On-Chain):** Al completarse el 100 % del fondeo (o alcanzar la meta mínima de la oferta), el sistema debe emitir las participaciones en el contrato `ProoflyOperations` (ERC-1155) asignadas a las wallets de los financiadores y programar el desembolso.
* **RF-15 (Desembolso Inmediato al Freelancer):** Una vez confirmada la emisión on-chain, el sistema debe ordenar el desembolso del adelanto neto ($A$) a la cuenta bancaria registrada del freelancer vía pasarela de pagos.

### 1.4. Módulo de Recaudo y Liquidación (Waterfall)
* **RF-16 (Instrucción de Pago para la Empresa Contratante):** La empresa contratante recibe los datos bancarios de la cuenta de recaudo controlada de Proofly para liquidar el 100 % del valor nominal al vencimiento.
* **RF-17 (Registro de Recaudo Bancario):** El Operador o webhook bancario registra el ingreso de fondos con el número de comprobante, conciliando contra la operación correspondiente.
* **RF-18 (Ejecución de Cascada de Pagos - Waterfall):** Al confirmarse el recaudo, el sistema ejecuta de forma inmutable la distribución:
  1. Capital aportado + Ganancia pactada a cada financiador en proporción exacta a sus participaciones.
  2. Comisión de la plataforma (Fee Proofly).
  3. Remanente al freelancer (si existió retención o ajuste favorable).
* **RF-19 (Reparto de Pagos Parciales):** Si la empresa paga un porcentaje del valor nominal, el sistema distribuye el recaudo pro-rata en enteros entre los financiadores mediante el **Algoritmo del Mayor Resto**, priorizando la recuperación de capital antes de ganancias.
* **RF-20 (Liquidación y Quema On-Chain):** Al finalizar la distribución, el contrato inteligente ejecuta `settleOperation`, marcando las participaciones como redimidas y registrando el hash de la evidencia de pago en Base.

---

## 2. Reglas de Negocio (RN)

* **RN-01 (Moneda Base Exclusiva):** Todas las transacciones, ofertas, balances y liquidaciones se calculan y presentan en Pesos Colombianos (COP).
* **RN-02 (Aritmética Entera):** Queda terminantemente prohibido el uso de flotantes (`float/double`) en cálculos financieros. Todo valor se almacena y opera en centavos de COP (`bigint` / `uint256`).
* **RN-03 (Tope Máximo de Usura):** La Tasa Efectiva Anual resultante del descuento cobrado al freelancer nunca podrá superar la tasa máxima de usura legal fijada por la Superintendencia Financiera de Colombia para el mes de originación.
* **RN-04 (Cupo Progresivo por Tiers):**
  - **Tier 1 (Semilla):** Hasta $ 2.000.000 COP, 1 operación activa simultánea, requiere confirmación explícita del cliente.
  - **Tier 2 (Crecimiento):** Hasta $ 8.000.000 COP, tras liquidar exitosamente 2 operaciones a tiempo; reducción de 150 bps en tasa base.
  - **Tier 3 (Pro):** Hasta $ 25.000.000 COP, tras liquidar 5+ operaciones; hasta 3 operaciones activas en paralelo.
* **RN-05 (Cascada Inmutable de Fondos):** Ningún fondo de recaudo puede desviarse a cuentas de Proofly o del freelancer antes de haber cubierto el 100 % del capital y rendimiento contractualmente adeudado a los financiadores.
* **RN-06 (Restricción de Transferencia On-Chain):** Los tokens ERC-1155 de `ProoflyOperations` no pueden ser transferidos a direcciones que no figuren con estado activo en el contrato `ProoflyKYCRegistry`.
* **RN-07 (Invariante Anti-Duplicado):** Una operación con la misma clave HMAC no puede registrarse en PostgreSQL ni emitirse en Solidity bajo ninguna circunstancia.

---

## 3. Restricciones Jurídicas y Normativas (RJ)

* **RJ-01 (Facturas como Título Valor - Ley 1231 de 2008 y Decreto 1154 de 2020):** Para ser financiada como factoring formal, la factura debe contar con: (a) Acuse de recibo de la factura, (b) Recibo de bienes o prestación de servicios, y (c) Aceptación expresa o tácita (después de 3 días hábiles sin reclamo) registrada ante el RADIAN.
* **RJ-02 (Hitos como Cesión Civil de Derechos Económicos):** Para contratos por hitos, la operación se estructura jurídicamente como cesión de derechos económicos de crédito futuro, documentada con mensaje de datos vinculante (Ley 527 de 1999) y aceptación verificable del contratante pagador.
* **RJ-03 (Protección de Datos Personales - Ley 1581 de 2012):** Prohibido registrar nombres, cédulas, correos, montos de facturación individuales o copias de contratos directamente en la blockchain. La blockchain solo contendrá hashes HMAC, IDs opacos y marcas temporales.
* **RJ-04 (Prevención de Captación Masiva e Ilegal):** Proofly no recibe depósitos a la vista ni ofrece rentabilidades garantizadas o libres de riesgo. Actúa como canal tecnológico de descuento y cesión de créditos donde los financiadores asumen el riesgo de crédito y cumplimiento de la operación elegida.

---

## 4. Requisitos No Funcionales (RNF)

* **RNF-01 (Conmutabilidad Sandbox / Producción):** El cambio entre Base Sepolia (con adaptadores mock) y Base Mainnet (con proveedores reales) debe realizarse cambiando únicamente variables de entorno (`ENV_MODE`, `CHAIN_ID`, `RPC_URL`) sin recompilar ni alterar código.
* **RNF-02 (Latencia de Cotización):** El cálculo de la oferta de descuento y simulación de retorno para el financiador debe resolverse en menos de 100 ms en backend.
* **RNF-03 (Consistencia Eventual y Outbox):** Las transacciones on-chain deben garantizar entrega *at-least-once* mediante el patrón Transactional Outbox, tolerando reorganizaciones de cadena (*reorgs*) de hasta 10 bloques en Base.
* **RNF-04 (Diseño Modo Claro Estricto):** La interfaz web y móvil no implementa tema oscuro. Debe cumplir con el estándar WCAG 2.1 Nivel AA en contraste tipográfico sobre fondo `#FFFFFF` y lavanda `#F8D4FD`.
* **RNF-05 (Seguridad de API):** Toda petición autenticada requiere JWT firmado, rate-limiting por IP/usuario y validación estricta de esquemas de entrada.

