# Proofly

<div align="center">

[![Base Network](https://img.shields.io/badge/Blockchain-Base%20(EVM)-0052FF?logo=ethereum&logoColor=white)](https://base.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity&logoColor=white)](https://soliditylang.org)
[![Foundry](https://img.shields.io/badge/Tested%20with-Foundry-FFA500?logo=ethereum&logoColor=white)](https://getfoundry.sh)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Architecture](https://img.shields.io/badge/Architecture-Hexagonal%20%2F%20Clean-7300FF)](docs/STATUS.md)
[![Test Suite](https://img.shields.io/badge/Tests-66%20Passing%20(100%25)-16A34A)](docs/STATUS.md)

**Liquidez para Freelancers. Retornos para Financiadores.**  
*Infraestructura Fintech y Real World Assets (RWA) sobre Base (EVM) para anticipo de facturas electrónicas e hitos de desarrollo.*

[Visión General](#1-visión-general) • [Arquitectura y Flujo](#2-arquitectura-y-flujo-operativo) • [Estructura](#3-estructura-del-monorepo) • [Invariantes](#4-principios-e-invariantes-de-ingeniería) • [Puesta en Marcha](#5-puesta-en-marcha-rápida) • [Blockchain](#6-integración-blockchain-base--evm) • [Marco Legal](#7-marco-legal-y-regulatorio) • [Documentación](#8-documentación-y-control-vivo)

</div>

---

## 1. Visión General

Proofly resuelve la brecha de capital de trabajo que enfrentan los profesionales independientes y agencias en economías emergentes, comenzando por Colombia:

- **Para Freelancers:** Acceso a liquidez inmediata en pesos colombianos (COP) sobre facturas electrónicas validadas (UBL 2.1) o hitos de contrato aprobados, sin incurrir en crédito bancario tradicional ni esperar pagos a 30, 60 o 90 días.
- **Para Financiadores (Inversionistas):** Acceso a un marketplace desintermediado de activos del mundo real (RWA) con Tasa Efectiva Anual (E.A.) transparente, colateralizado en la cesión legal de derechos económicos y registrado on-chain.
- **Evaluación Dual de Riesgo:** Desacoplamiento entre el *Score de Ejecución del Freelancer* (reputación y cumplimiento de entregables) y el *Score de Solvencia del Pagador Corporativo* (capacidad financiera de la empresa contratante).
- **Onboarding Progresivo:** Sistema de niveles de cupo (*Tiers*: Semilla, Crecimiento y Pro) que mitiga el riesgo de crédito inicial y premia la recurrencia exitosa.

---

## 2. Arquitectura y Flujo Operativo

El sistema orquesta la originación, validación jurídica/técnica, fondeo fraccionado y liquidación en cascada mediante una arquitectura hexagonal desacoplada:

```mermaid
flowchart TD
    subgraph Origination["1. Originación & Scoring"]
        FL["Freelancer"] -->|"Factura Electrónica UBL 2.1"| RADIAN["Validación CUFE & RADIAN"]
        FL -->|"Contrato por Hitos"| HITO["Token Seguro One-Time a Pagador"]
        RADIAN & HITO --> ENGINE["FinancialEngine & TiersPolicy"]
    end

    subgraph Marketplace["2. Marketplace & Sindicación"]
        ENGINE -->|"Operación Aprobada"| MK["Marketplace Proofly"]
        INV1["Financiador A"] -->|"Aporte Fraccionario"| MK
        INV2["Financiador B"] -->|"Aporte Fraccionario"| MK
        MK -->|"Algoritmo Mayor Resto (0¢ residuo)"| SHARES["Distribución de Participaciones"]
    end

    subgraph OnChain["3. Tokenización Base (EVM)"]
        SHARES -->|"Outbox Pattern (Postgres)"| WORKER["Async Dispatcher Worker"]
        WORKER -->|"Mint Fraccionado ERC-1155"| CONTRACT["ProoflyOperations.sol"]
        CONTRACT -.->|"Verificación Operadores"| KYC["ProoflyKYCRegistry.sol"]
    end

    subgraph Settlement["4. Recaudo & Cascada Waterfall"]
        PAYER["Empresa Pagadora"] -->|"Transferencia Bancaria"| RECAUDO["Webhook Recaudo Bancario"]
        RECAUDO --> WATERFALL["Liquidación en Cascada"]
        WATERFALL -->|"Capital + Rendimiento E.A."| FIN_PAY["Retorno a Financiadores"]
        WATERFALL -->|"Excedente / Saldo"| FL_PAY["Remanente a Freelancer"]
        WATERFALL -->|"Burn / Settle"| CONTRACT
    end
```

---

## 3. Estructura del Monorepo

Organizado como un monorepo modular con workspaces de npm y Turborepo:

```text
proofly/
├── apps/
│   ├── web/               # Frontend React + Tailwind, mobile-first Light Mode
│   ├── api/               # API REST (Fastify/Node), auth scrypt, HTTPOnly cookies
│   └── worker/            # Dispatcher asíncrono outbox hacia Base blockchain
├── packages/
│   ├── domain/            # Núcleo puro de dominio (FinancialEngine, Tiers, CUFE)
│   └── contracts-sdk/     # Bindings tipados y adaptadores viem para contratos
├── contracts/             # Smart contracts Solidity 0.8.24 + Foundry
│   ├── src/
│   │   ├── ProoflyOperations.sol   # ERC-1155 con emisión fraccionada y dossier hash
│   │   └── ProoflyKYCRegistry.sol  # Registro de operadores KYC autorizados
│   └── test/              # Tests unitarios y suites de fuzzing con Foundry
├── db/                    # Esquema DDL idempotente PostgreSQL + SKIP LOCKED
├── docs/                  # Fuentes de verdad, arquitectura y auditorías
└── scripts/               # Verificación E2E, pruebas de carga y simulación
```

---

## 4. Principios e Invariantes de Ingeniería

El núcleo de Proofly respeta **15 invariantes no negociables** (ver [`docs/STATUS.md`](docs/STATUS.md)):

1. **Aritmética Entera de Precisión (COP):** Todas las cantidades monetarias se calculan en centavos enteros (`bigint` / `uint256`), eliminando cualquier error de punto flotante.
2. **Conservación de Masa (Algoritmo del Mayor Resto):** La sindicación entre múltiples inversionistas y la liquidación de recaudos parciales utiliza el algoritmo de Hare-Niemeyer, garantizando que $\sum \text{partes} \equiv \text{total}$ sin perder ni un solo centavo.
3. **Privacidad Estricta On-Chain (Zero PII):** Los smart contracts almacenan únicamente hashes criptográficos opacos de 32 bytes (`dossierHash`, `hmac`). Ningún dato personal (nombres, documentos, emails) toca la blockchain.
4. **Prevención de Doble Financiación:** Detección determinista por HMAC canónico de la factura/hito antes de admitir cualquier operación.
5. **Identidad Unificada:** Un único perfil permite tanto financiarse (adelanto) como invertir (retornos), prohibiendo estrictamente que una persona invierta en sus propias operaciones.
6. **Sistema de Diseño Modo Claro Absoluto:** Estética mobile neobank (`#FFFFFF` fondo puro, `#F8D4FD` superficies secundarias, `#7300FF` acento eléctrico, `#000000` botones primarios y `#16A34A` retornos positivos).

---

## 5. Puesta en Marcha Rápida

### Requisitos Previos
- **Node.js** `>= 22.0.0` (soporte nativo de `--experimental-strip-types`)
- **npm** `>= 10.0.0`
- **Docker** y **Docker Compose** (para PostgreSQL local, opcional en modo memoria)
- **Foundry** (opcional, para compilar y probar contratos Solidity)

### Instalación y Servidor de Desarrollo

```sh
# 1. Clonar el repositorio e instalar dependencias
git clone https://github.com/lawxr/proofly.git
cd proofly
npm install

# 2. Levantar el servidor de desarrollo
npm run dev
# Acceder en: http://127.0.0.1:3000
```

El servidor local arranca por defecto con adaptadores en memoria para desarrollo inmediato:
- `/`: Landing page pública con cotizador interactivo.
- `/login`: Registro e inicio de sesión con hashing seguro `scrypt` y cookies `HttpOnly` (`SameSite=Strict`).
- `/app/`: Aplicación financiera mobile-first (Inicio, Operaciones, Mercado, Portafolio y Actividad).

### Persistencia Real con PostgreSQL

```sh
# Levantar contenedor Postgres con esquema inicializado
docker compose up -d postgres

# Arrancar el servidor conectado a Postgres
PERSISTENCE=postgres DATABASE_URL=postgresql://proofly:proofly@127.0.0.1:5432/proofly npm run dev

# Ejecutar verificaciones de persistencia y auth
node --experimental-strip-types scripts/verify-postgres.mjs
node --experimental-strip-types scripts/verify-auth-postgres.mjs
```

---

## 6. Integración Blockchain (Base / EVM)

Proofly utiliza una capa modular basada en `viem` que conmuta entre un adaptador simulado (mock), una red local determinista (Anvil) y Base Sepolia / Mainnet:

```sh
# 1. Iniciar cadena local Anvil (chain-id 84532)
anvil --host 127.0.0.1 --port 8545 --chain-id 84532

# 2. Desplegar contratos inteligentes con Foundry
cd contracts && forge script script/Deploy.s.sol:DeployProofly \
  --rpc-url http://127.0.0.1:8545 --broadcast

# 3. Probar el flujo real con el adaptador viem
cd ..
set -a; source .env.anvil; set +a
node --experimental-strip-types scripts/verify-chain.mjs
BLOCKCHAIN_ADAPTER=viem node --experimental-strip-types scripts/verify-worker-chain.mjs
```

### Contratos Principales
- [`ProoflyOperations.sol`](contracts/src/ProoflyOperations.sol): Token semi-fungible ERC-1155 que representa derechos económicos fraccionados sobre cada operación aprobada.
- [`ProoflyKYCRegistry.sol`](contracts/src/ProoflyKYCRegistry.sol): Registro on-chain de identidades verificadas (permite transferencias únicamente entre partes con KYC aprobado).

---

## 7. Batería de Pruebas y Aseguramiento de Calidad

Proofly cuenta con **cobertura integral del 100%** en todas sus capas:

```sh
# Suite de pruebas unitarias, dominio y flujo E2E REST
npm test

# Suite de contratos inteligentes con fuzzing (Foundry)
npm run test:contracts

# Validación estática de scripts
npm run check

# Pruebas end-to-end de interfaz en navegador (Playwright)
npm run test:browser
```

### Batería QA-01 a QA-06 (`tests/e2e/qa-suite.test.ts`)
- **QA-01:** Onboarding y cupo inicial Tier 1 Semilla ($ 2.000.000 COP).
- **QA-02:** Originación por factura electrónica UBL 2.1 y verificación RADIAN.
- **QA-03:** Originación por hito con token criptográfico de un solo uso.
- **QA-04:** Fondeo fraccionado en marketplace y minteo ERC-1155 en Base L2.
- **QA-05:** Recaudo bancario completo (100%) y liquidación en cascada Waterfall ($0 COP de discrepancia).
- **QA-06:** Pago parcial (60%) y distribución pro-rata entera por Mayor Resto entre 3 financiadores.

---

## 8. Marco Legal y Regulatorio

Diseñado conforme al marco jurídico y financiero de la República de Colombia:
- **Ley 1231 de 2008:** Régimen de la factura electrónica como título valor transmisible.
- **Decreto 1154 de 2020:** Circulación de la factura electrónica en el sistema RADIAN de la DIAN.
- **Ley 1581 de 2012:** Protección de datos personales (Habeas Data) garantizada mediante hashing y ausencia de PII on-chain.
- **Cesión de Derechos Económicos:** Formalización de contratos marco de cesión de crédito para operaciones por hitos de desarrollo.

---

## 9. Documentación y Control Vivo

| Documento | Enlace | Propósito |
| :--- | :--- | :--- |
| **Estado y Fases** | [`docs/STATUS.md`](docs/STATUS.md) | Seguimiento en tiempo real de fases y las 15 invariantes |
| **Sistema de Diseño** | [`docs/fuentes/DESIGN.md`](docs/fuentes/DESIGN.md) | Tokens de color, componentes y reglas del Modo Claro Absoluto |
| **Enfoque de Negocio** | [`docs/fuentes/enfoque-proofly.md`](docs/fuentes/enfoque-proofly.md) | Tesis de mercado, modelo dual y activos financiables |
| **Informe Regulatorio** | [`docs/fuentes/informe-proyecto.md`](docs/fuentes/informe-proyecto.md) | Marco legal colombiano, RADIAN y gestión de riesgos |
| **Preguntas Abiertas** | [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md) | Registro y resolución de puntos críticos de arquitectura |
| **Glosario Unificado** | [`docs/GLOSSARY.md`](docs/GLOSSARY.md) | Definiciones técnicas y financieras unificadas |

---

<div align="center">
Desarrollado con rigor arquitectónico para empoderar a los creadores y freelancers de América Latina.
</div>
