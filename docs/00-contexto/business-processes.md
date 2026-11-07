# Procesos de Negocio en Mermaid — Proofly (`docs/00-contexto/business-processes.md`)

Este documento modela mediante diagramas de secuencia e interacción en Mermaid los siete procesos de negocio esenciales de **Proofly**, cubriendo el ciclo de vida completo de originación, evaluación de cupo, fondeo, desembolso y liquidación en cascada.

---

## 1. Proceso 1: Originación por Factura Electrónica

```mermaid
sequenceDiagram
    autonumber
    actor Freelancer
    participant UI as Web/Mobile App
    participant API as API Core (NestJS)
    participant Engine as Engine & Scoring
    participant Radian as RADIAN / DIAN Port
    participant DB as PostgreSQL

    Freelancer->>UI: Carga factura XML (UBL 2.1)
    UI->>API: POST /api/v1/operations/invoice (file XML)
    API->>Radian: Consultar estado y acuses (3 eventos obligatorios)
    Radian-->>API: Acuse recibo + Recibo bienes + Aceptación expresa/tácita
    API->>Engine: Calcular HMAC canónico y validar unicidad
    Engine->>DB: Verificar duplicados (UNIQUE HMAC)
    DB-->>Engine: Clave libre (sin registros previos)
    API->>Engine: Calcular oferta (Adelanto, Descuento, Fee, E.A.)
    Engine-->>API: Oferta financiera generada
    API->>DB: Guardar operación (Estado: QUOTED)
    API-->>UI: Mostrar cotización al instante en COP
    Freelancer->>UI: Aceptar oferta y firmar cesión electrónica
    UI->>API: POST /api/v1/operations/{id}/accept-quote
    API->>DB: Actualizar estado a APPROVED_PENDING_FUNDING
    API-->>UI: Operación enviada a Marketplace
```

---

## 2. Proceso 2: Originación por Hito Contractual (Milestone)

```mermaid
sequenceDiagram
    autonumber
    actor Freelancer
    participant UI as Web/Mobile App
    participant API as API Core
    actor Client as Empresa Contratante
    participant Engine as Engine & Scoring
    participant DB as PostgreSQL

    Freelancer->>UI: Registra contrato, monto nominal, fecha entrega y link entregable
    UI->>API: POST /api/v1/operations/milestone
    API->>Engine: Validar cupo disponible del Freelancer (Tier actual)
    Engine-->>API: Cupo suficiente
    API->>DB: Guardar hito (Estado: PENDING_CLIENT_CONFIRMATION)
    API->>Client: Enviar enlace seguro de verificación por correo/SMS
    Client->>UI: Abre enlace web seguro (sin registro requerido)
    Client->>UI: Revisa entregable y hace clic en "Confirmar Hito"
    UI->>API: POST /api/v1/milestones/{token}/confirm
    API->>Engine: Calcular HMAC canónico único del hito
    API->>Engine: Calcular oferta de descuento y plazo en días
    API->>DB: Actualizar estado a CLIENT_CONFIRMED_PENDING_FREELANCER
    API->>Freelancer: Notificar oferta disponible para firma
    Freelancer->>UI: Firma cesión de derechos económicos
    UI->>API: POST /api/v1/operations/{id}/sign-cession
    API->>DB: Actualizar estado a APPROVED_PENDING_FUNDING
```

---

## 3. Proceso 3: Cálculo de Cupo Progresivo (Tiers para Freelancers)

```mermaid
flowchart TD
    Start([Freelancer completa KYC exitoso]) --> CheckHist{¿Tiene operaciones previas en Proofly?}
    CheckHist -- No --> Tier1[Asignar Tier 1 - Semilla<br>Cupo: Hasta $ 2.000.000 COP<br>Tasa Base: Estándar<br>Máx: 1 operación activa simultánea<br>Requisito: Confirmación directa del contratante]
    CheckHist -- Sí --> EvalHist[Evaluar historial histórico]

    EvalHist --> CheckOps{Operaciones exitosas liquidadas a tiempo}
    CheckOps -- ">= 2 operaciones" --> CheckDelay{¿Retrasos en entregas > 5 días?}
    CheckOps -- ">= 5 operaciones" --> CheckHighRating{Score de ejecución >= 90/100}

    CheckDelay -- No --> Tier2[Asignar Tier 2 - Crecimiento<br>Cupo: Hasta $ 8.000.000 COP<br>Descuento tasa: -150 bps<br>Máx: 2 operaciones activas simultáneas]
    CheckDelay -- Sí --> Tier1

    CheckHighRating -- Sí --> Tier3[Asignar Tier 3 - Pro<br>Cupo: Hasta $ 25.000.000 COP<br>Descuento tasa: -300 bps<br>Máx: 3 operaciones activas simultáneas<br>Aprobación inmediata de hitos]
    CheckHighRating -- No --> Tier2

    Tier1 --> DB[(Guardar en PostgreSQL: freelancer_profiles)]
    Tier2 --> DB
    Tier3 --> DB
```

---

## 4. Proceso 4: Publicación y Fondeo por Financiadores (Marketplace)

```mermaid
sequenceDiagram
    autonumber
    actor Financiador
    participant UI as Dashboard Financiador
    participant API as API Core
    participant DB as PostgreSQL
    participant Outbox as Transactional Outbox
    participant Worker as Blockchain Worker
    participant Base as Contrato ProoflyOperations (Base L2)

    Financiador->>UI: Explora marketplace y selecciona operación
    UI->>UI: Simula en tiempo real (monto -> ganancia en COP y E.A.)
    Financiador->>UI: Confirma compra de participación ($ 500.000 COP)
    UI->>API: POST /api/v1/operations/{id}/participations
    API->>DB: Iniciar transacción ACID
    API->>DB: Validar saldo disponible y bloquear cupo de la operación
    API->>DB: Registrar participación del financiador
    API->>DB: ¿Operación 100% fondeada? (Sí)
    API->>DB: Cambiar estado a FUNDED_PENDING_MINT
    API->>DB: Insertar evento MINT_OPERATION en outbox
    API->>DB: Confirmar transacción ACID (COMMIT)
    API-->>UI: Participación adquirida con éxito
    Outbox->>Worker: Detecta evento de minteo pendiente
    Worker->>Base: mintBatch / fundOperation (HMAC, valor nominal, participaciones)
    Base-->>Worker: Tx Confirmada en bloque Base
    Worker->>DB: Marcar outbox procesado y estado: ACTIVE_FUNDED
```

---

## 5. Proceso 5: Desembolso del Adelanto al Freelancer

```mermaid
sequenceDiagram
    autonumber
    participant Worker as Blockchain Worker
    participant DB as PostgreSQL
    participant PayPort as PaymentRailPort (PSE/ACH/Bancario)
    participant Bank as Banco del Freelancer
    actor Freelancer

    Worker->>DB: Detecta operación ACTIVE_FUNDED recién confirmada on-chain
    Worker->>PayPort: Ordenar transferencia de fondos (Adelanto Neto A en COP)
    PayPort->>Bank: Dispersión interbancaria (ACH / Transfiya)
    Bank-->>PayPort: Transferencia exitosa (ID de rastreo bancario)
    PayPort-->>Worker: Confirmación de dispersión
    Worker->>DB: Registrar transacción de pago y comprobante
    Worker->>DB: Actualizar estado a DISBURSED_AWAITING_SETTLEMENT
    Worker->>Freelancer: Notificar notificación push/email con comprobante de pago
    Freelancer-->>Freelancer: Dispone de su dinero inmediatamente
```

---

## 6. Proceso 6: Recaudo y Distribución de Ganancias (Waterfall)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Empresa Contratante
    participant BankRecaudo as Cuenta Recaudo / Fiduciaria
    actor Operator as Operador / Conciliador
    participant API as API Core
    participant DB as PostgreSQL
    participant Engine as FinancialEngine (Mayor Resto)
    participant Outbox as Transactional Outbox
    participant Worker as Blockchain Worker
    participant Base as Contrato ProoflyOperations
    actor Financiador

    Client->>BankRecaudo: Transfiere el 100 % del valor nominal ($ 1.500.000 COP)
    BankRecaudo-->>Operator: Extracto bancario confirma abono con referencia única
    Operator->>API: POST /api/v1/settlement/reconcile (ref, comprobante, monto)
    API->>Engine: Ejecutar Cascada Waterfall:
    Note over Engine: 1. Capital + Ganancia a cada Financiador (Mayor Resto)<br>2. Comisión de Proofly<br>3. Remanente a Freelancer (si existe)
    API->>DB: Acreditar saldo en balance de Financiadores
    API->>DB: Acreditar comisiones operativas de Proofly
    API->>DB: Cambiar estado a SETTLED
    API->>DB: Insertar evento SETTLE_OPERATION en outbox con hash de comprobante
    API->>DB: Confirmar COMMIT
    Outbox->>Worker: Polling detecta liquidación
    Worker->>Base: settleOperation(operationId, proofHash)
    Base-->>Worker: Tokens ERC-1155 marcados como redimidos
    Worker->>DB: Marcar outbox como ejecutado
    API->>Financiador: Notificar saldo disponible (Capital + Ganancia)
```

---

## 7. Proceso 7: Pago Parcial y Gestión de Mora

```mermaid
sequenceDiagram
    autonumber
    actor Client as Empresa Contratante
    participant BankRecaudo as Cuenta Recaudo
    participant API as API Core
    participant Engine as FinancialEngine (Mayor Resto)
    participant DB as PostgreSQL
    actor Financiador

    Note over Client,BankRecaudo: Llega la fecha de vencimiento y el cliente abona solo el 60 % ($ 900.000 de $ 1.500.000)
    BankRecaudo-->>API: Notificación de abono parcial
    API->>Engine: Reparto Pro-Rata en enteros con Algoritmo del Mayor Resto:
    Note over Engine: Prioridad 1: Reembolsar capital base a financiadores sin pérdida de centavos<br>Prioridad 2: Saldo restante queda en estado PENDING_BALANCE
    API->>DB: Acreditar $ 900.000 entre las billeteras de los financiadores
    API->>DB: Actualizar estado de la operación a PARTIALLY_SETTLED_OVERDUE
    API->>DB: Iniciar cobro de intereses de mora sobre el saldo insoluto (40 %)
    API->>Financiador: Notificar recuperación parcial de capital y gestión de cobranza
    API->>Client: Enviar notificación preventiva de cobro prejudicial automatizada
```

