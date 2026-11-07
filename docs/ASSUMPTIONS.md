# Supuestos de Arquitectura y Negocio — Proofly (`docs/ASSUMPTIONS.md`)

Este documento consolida los supuestos explícitos bajo los cuales se construye la plataforma **Proofly**. Cualquier cambio sobre estos supuestos debe evaluarse en un Architecture Decision Record (ADR).

---

## 1. Supuestos Financieros y Monetarios

* **AS-FIN-01 (Moneda y Unidad de Cuenta):** La unidad de cuenta y liquidación es el Peso Colombiano (COP). No se emite ni se transa ningún token especulativo ni volátil propio.
* **AS-FIN-02 (Aritmética Entera Estricta):** Todos los cálculos financieros se realizan en centavos de COP (`bigint` en backend, `uint256` en Solidity). No se utiliza aritmética de coma flotante (`IEEE 754`) en el motor financiero para evitar descuadres por redondeo.
* **AS-FIN-03 (Límite Legal de Usura):** La Tasa Efectiva Anual (E.A.) resultante del descuento comercial y comisiones nunca excederá la tasa de usura certificada mensualmente por la Superintendencia Financiera de Colombia para la modalidad de crédito de consumo u ordinario.
* **AS-FIN-04 (Algoritmo de Reparto Determinista):** En operaciones con múltiples financiadores o pagos parciales, la distribución de capital y ganancias se realiza mediante el Algoritmo del Mayor Resto (*Largest Remainder Method*), garantizando que la suma de partes sea idéntica al monto recaudado.
* **AS-FIN-05 (Cupo Semilla Inicial):** Todo freelancer que apruebe el KYC tiene acceso al Tier Semilla con un cupo inicial de hasta $ 2.000.000 COP para su primer hito o factura, condicionado a la confirmación de la empresa contratante.

---

## 2. Supuestos Jurídicos y Regulatorios (Colombia)

* **AS-LEG-01 (Doble Instrumento Jurídico):**
  * Para **Facturas Electrónicas:** Aplica el régimen de título valor (Ley 1231 de 2008 y Decreto 1154 de 2020), requiriendo los tres acuses obligatorios en RADIAN para negociabilidad.
  * Para **Hitos Contractuales (Milestones):** Aplica la cesión electrónica de derechos económicos futuros (Código de Comercio y Código Civil), validada mediante firma electrónica y aceptación verificable de la empresa contratante.
* **AS-LEG-02 (Patrimonio Autónomo / Cuenta de Recaudo):** Los pagos de las empresas contratantes ingresan a cuentas de recaudo controladas o patrimonios autónomos fiduciarios, evitando la captación masiva ilegal y asegurando la ejecución de la cascada de pagos (Waterfall).
* **AS-LEG-03 (Privacidad de Datos - Ley 1581 de 2012):** Ninguna información personal identificable (PII), RUT, documento de identidad o PDF contractual se almacena en la blockchain. On-chain solo se registran identificadores opacos y hashes criptográficos HMAC.

---

## 3. Supuestos Técnicos y de Infraestructura

* **AS-TECH-01 (Multi-Entorno por Configuración):** La aplicación debe funcionar de forma idéntica en entorno de pruebas (*sandbox* con Base Sepolia y mocks de pasarelas/KYC) y en producción (*production* con Base Mainnet y proveedores reales), dependiendo exclusivamente de variables de entorno tipadas (`ENV_MODE`, `RPC_URL`, `CHAIN_ID`).
* **AS-TECH-02 (Arquitectura Hexagonal):** El núcleo de dominio (`packages/domain`) es TypeScript puro, libre de dependencias de frameworks o librerías de infraestructura (NestJS, Drizzle, viem).
* **AS-TECH-03 (Fuente de Verdad Operativa):** PostgreSQL es la fuente de verdad operativa rápida y relacional. La blockchain Base actúa como libro mayor descentralizado de titularidad jurídica de participaciones y liquidación auditable.
* **AS-TECH-04 (Patrón Outbox y Resiliencia Blockchain):** Las escrituras on-chain se encolan en una tabla `outbox` dentro de la misma transacción de base de datos. Un worker asíncrono gestiona el reintento, gas pricing y reorganizaciones de bloques (*reorgs*), garantizando entrega al menos una vez (*at-least-once*) con idempotencia estricta.
* **AS-TECH-05 (Abstracción de Cuentas Web2):** Los usuarios (freelancers y financiadores) no necesitan billeteras Web3 externas como MetaMask ni fondos en ETH para interactuar con la plataforma. La infraestructura provee wallets gestionadas o Paymasters ERC-4337.

---

## 4. Supuestos de Experiencia de Usuario y Diseño

* **AS-UI-01 (Modo Claro Absoluto):** La plataforma no admitirá Modo Oscuro para salvaguardar la coherencia de marca, el contraste de lectura financiera y la estética mobile fintech.
* **AS-UI-02 (Diseño Mobile-First):** La experiencia principal está concebida para pantallas de smartphones (viewport 320px a 430px) con botones táctiles en píldora, tarjetas bento y navegación inferior flotante.
* **AS-UI-03 (Aprobación sin Registro para Clientes):** Las empresas contratantes aprueban hitos y reciben datos de recaudo mediante enlaces seguros y amigables por correo/SMS, sin fricción de registro o autenticación de múltiples pasos.
