# Diagramas C4 de Arquitectura — Proofly (`docs/architecture/02-c4-diagrams.md`)

Este documento presenta los diagramas de arquitectura del sistema **Proofly** siguiendo el modelo C4 (Contexto, Contenedores y Componentes), representados formalmente mediante sintaxis estándar de Mermaid.

---

## 1. Nivel 1: Diagrama de Contexto de Sistema (System Context)

El diagrama de contexto ilustra la frontera del sistema Proofly, los actores humanos principales y los sistemas externos con los que se integra.

```mermaid
flowchart TD
    subgraph Actores ["Actores Humanos"]
        Freelancer["👤 Freelancer / Independiente<br>Solicita adelanto por facturas o hitos"]
        Financier["👤 Financiador / Inversionista<br>Aporta liquidez para obtener retornos en COP"]
        Client["🏢 Empresa Contratante (Pagador)<br>Valida entregables y efectúa el pago final"]
        Operator["🛡️ Operador Proofly<br>Concilia recaudos y resuelve excepciones"]
    end

    subgraph ProoflySystem ["Sistema Proofly"]
        Proofly["✨ Plataforma Proofly<br>(Monolito Hexagonal + Web & Mobile App + Base Smart Contracts)"]
    end

    subgraph ExternalSystems ["Sistemas Externos"]
        Radian["🏛️ DIAN / RADIAN<br>Registro y validación de facturas electrónicas"]
        BankRails["🏦 Rieles Bancarios / PSE / ACH<br>Recepción de recaudo y dispersión de adelantos/ganancias"]
        BaseL2["⛓️ Red Base (Ethereum L2)<br>Libro mayor de participaciones ERC-1155 y KYCRegistry"]
        KycService["🆔 Proveedor KYC / AML (Truora / MetaMap)<br>Verificación de identidad y listas restrictivas"]
    end

    Freelancer -->|"Carga facturas/hitos y recibe adelanto en COP"| Proofly
    Financier -->|"Explora operaciones, financia y recibe rendimientos"| Proofly
    Client -->|"Confirma hitos vía enlace y paga al recaudo"| Proofly
    Operator -->|"Supervisa conciliación y estado del outbox"| Proofly

    Proofly -->|"Consulta eventos y títulos valores"| Radian
    Proofly -->|"Ordena transferencias bancarias y valida pagos"| BankRails
    Proofly -->|"Emite participaciones y registra liquidaciones"| BaseL2
    Proofly -->|"Valida antecedentes y biometría"| KycService
```

---

## 2. Nivel 2: Diagrama de Contenedores (Container Diagram)

El diagrama de contenedores descompone el sistema Proofly en sus aplicaciones desplegables, almacenes de datos y componentes de red.

```mermaid
flowchart TD
    subgraph Clients ["Clientes Frontend"]
        WebApp["🌐 Web & Mobile App<br>(React + Vite + Tailwind CSS)<br>Modo Claro Absoluto"]
    end

    subgraph Backend ["Backend & Procesamiento"]
        ApiCore["⚙️ API Core (NestJS + TypeScript)<br>Monolito Modular Hexagonal<br>Autenticación, Originación, Marketplace, Waterfall"]
        Worker["🔄 Blockchain & Outbox Worker (Node.js)<br>Despacho a Base, Indexador de eventos y Conciliador"]
    end

    subgraph Storage ["Almacenamiento & Caché"]
        Postgres[("🐘 PostgreSQL 16<br>Fuente de verdad operativa relacional<br>Users, Operations, Participations, Outbox")]
        Redis[("⚡ Redis 7<br>Caché de sesiones, rate-limiting y cotizaciones")]
    end

    subgraph BlockchainContainer ["Blockchain Layer (Base L2)"]
        KYCReg["📜 ProoflyKYCRegistry.sol<br>Control de acceso y direcciones validadas"]
        OpsContract["📜 ProoflyOperations.sol (ERC-1155)<br>Registro de dossier hasheado, participaciones y liquidación"]
    end

    subgraph ExternalAdapters ["Servicios Externos"]
        ExtRadian["🏛️ RADIAN API"]
        ExtBank["🏦 Pasarela Pagos (PSE/ACH)"]
        ExtKYC["🆔 Proveedor KYC"]
        RpcBase["🌐 Base RPC Node (Sepolia / Mainnet)"]
    end

    WebApp -->|"HTTPS / REST / JSON (JWT)"| ApiCore
    ApiCore -->|"Lectura / Escritura ACID"| Postgres
    ApiCore -->|"Caché & Throttling"| Redis
    ApiCore -->|"HTTP / REST (Sandbox/Prod Ports)"| ExtRadian
    ApiCore -->|"HTTP / REST (Sandbox/Prod Ports)"| ExtBank
    ApiCore -->|"HTTP / REST (Sandbox/Prod Ports)"| ExtKYC

    Worker -->|"Poll & Update (SKIP LOCKED)"| Postgres
    Worker -->|"Web3 JSON-RPC (viem)"| RpcBase
    RpcBase -->|"Invoca transacciones"| KYCReg
    RpcBase -->|"Invoca transacciones"| OpsContract
```

---

## 3. Nivel 3: Diagrama de Componentes de la API Core (Component Diagram)

Detalla la organización interna hexagonal del contenedor `API Core`, separando Adaptadores Primarios (Inbound), Servicios de Aplicación, Núcleo de Dominio y Adaptadores Secundarios (Outbound).

```mermaid
flowchart TD
    subgraph InboundAdapters ["Adaptadores Primarios (Inbound)"]
        HttpControllers["🎮 Controladores REST (NestJS)<br>/auth, /operations, /marketplace, /settlement"]
        ClientVerifyController["🔗 Controlador de Verificación de Hitos<br>/milestones/{token}/confirm"]
        WebhookController["📥 Webhook Controller Bancario<br>/webhooks/payment-notifications"]
    end

    subgraph ApplicationLayer ["Capa de Aplicación (Casos de Uso)"]
        OriginateInvoiceUC["Originación por Factura UC"]
        OriginateMilestoneUC["Originación por Hito UC"]
        SimulateQuoteUC["Simulación de Cotización UC"]
        FundParticipationUC["Fondeo de Participación UC"]
        ReconcileSettlementUC["Conciliación y Waterfall UC"]
    end

    subgraph DomainCore ["Núcleo de Dominio Puro (packages/domain)"]
        FinancialEngine["🧮 FinancialEngine<br>Cálculo de descuento, adelanto, E.A. y Mayor Resto"]
        StateMachine["🚦 OperationStateMachine<br>Reglas de transición y guardas canónicas"]
        AntiDuplicateService["🔒 AntiDuplicateService<br>Cálculo de HMAC-SHA256 canónico"]
        TiersPolicy["📈 Tiers & Quota Policy<br>Reglas de progresión para freelancers"]
    end

    subgraph OutboundPorts ["Puertos de Salida (Interfaces)"]
        RepoPort["DB Repository Ports<br>(Operations, Users, Participations)"]
        InvoicePort["InvoiceVerificationPort"]
        MilestonePort["MilestoneConfirmationPort"]
        KycPort["KycPort"]
        PaymentPort["PaymentRailPort"]
        OutboxPort["OutboxQueuePort"]
    end

    subgraph OutboundAdapters ["Adaptadores Secundarios (Implementaciones)"]
        DrizzleAdapter["🐘 Drizzle / Prisma PostgreSQL Adapter"]
        RadianAdapter["🏛️ RadianAdapter (Mock / Real HTTP)"]
        MailAdapter["✉️ Email/SMS Token Confirmation Adapter"]
        KycAdapter["🆔 KycAdapter (Mock / MetaMap API)"]
        BankAdapter["🏦 BankPaymentAdapter (Mock / PSE API)"]
        PostgresOutboxAdapter["📤 Postgres Outbox Table Adapter"]
    end

    HttpControllers --> ApplicationLayer
    ClientVerifyController --> OriginateMilestoneUC
    WebhookController --> ReconcileSettlementUC

    ApplicationLayer --> DomainCore

    OriginateInvoiceUC --> InvoicePort
    OriginateMilestoneUC --> MilestonePort
    FundParticipationUC --> OutboxPort
    ReconcileSettlementUC --> PaymentPort
    ApplicationLayer --> RepoPort

    RepoPort --> DrizzleAdapter
    InvoicePort --> RadianAdapter
    MilestonePort --> MailAdapter
    PaymentPort --> BankAdapter
    OutboxPort --> PostgresOutboxAdapter
```

