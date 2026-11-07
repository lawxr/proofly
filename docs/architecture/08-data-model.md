# Modelo de Datos Operacional (PostgreSQL) — Proofly (`docs/architecture/08-data-model.md`)

Este documento documenta la arquitectura relacional de **Proofly**, implementada en PostgreSQL 16 y disponible en [`db/schema.sql`](../../db/schema.sql). Está diseñada para garantizar consistencia transaccional ACID, precisión monetaria sin errores de redondeo y sincronización asíncrona con la red Base L2.

---

## 1. Diagrama Entidad-Relación (ERD) en Mermaid

```mermaid
erDiagram
    users ||--o| freelancer_profiles : "tiene perfil"
    users ||--o| kyc_verifications : "tiene verificación"
    users ||--o| financier_balances : "posee balance"
    users ||--o{ operations : "origina como freelancer"
    companies ||--o{ operations : "pagador/deudor"
    
    operations ||--o| invoice_details : "detalle factura UBL"
    operations ||--o| milestone_details : "detalle hito"
    operations ||--o{ participations : "fraccionada en"
    users ||--o{ participations : "financia como inversionista"
    
    operations ||--o{ bank_receipts : "recauda abonos"
    bank_receipts ||--o{ settlement_distributions : "distribuye vía Waterfall"
    participations ||--o{ settlement_distributions : "recibe pago"
    
    operations ||--o{ outbox_events : "encola eventos blockchain"

    users {
        uuid id PK
        varchar email UK
        varchar full_name
        user_role role
        char wallet_address
        boolean is_active
    }

    freelancer_profiles {
        uuid user_id PK,FK
        freelancer_tier tier
        bigint current_quota_cents
        bigint available_quota_cents
        int execution_score
        int successful_operations_count
    }

    companies {
        uuid id PK
        varchar nit UK
        varchar legal_name
        int credit_score
        bigint total_financed_cents
    }

    operations {
        uuid id PK
        varchar canonical_hmac UK
        uuid freelancer_id FK
        uuid company_id FK
        operation_status status
        bigint nominal_amount_cents
        bigint discount_amount_cents
        bigint proofly_fee_cents
        bigint advance_amount_cents
        bigint funded_amount_cents
        date due_date
        numeric effective_annual_rate
    }

    participations {
        uuid id PK
        uuid operation_id FK
        uuid financier_id FK
        bigint funded_capital_cents
        bigint expected_yield_cents
        bigint nominal_share_cents
        boolean is_settled
    }

    bank_receipts {
        uuid id PK
        uuid operation_id FK
        varchar bank_reference UK
        bigint received_amount_cents
        char receipt_proof_hash
        timestamptz received_at
    }

    settlement_distributions {
        uuid id PK
        uuid bank_receipt_id FK
        uuid participation_id FK
        bigint capital_paid_cents
        bigint yield_paid_cents
    }

    outbox_events {
        uuid id PK
        varchar aggregate_id
        varchar event_type
        jsonb payload
        outbox_status status
        varchar tx_hash
    }
```

---

## 2. Decisiones Clave del Modelo de Datos

### 2.1. Representación Monetaria en Centavos Enteros (`BIGINT`)
En cumplimiento de la **Invariante I9**, no existen columnas de tipo `FLOAT` ni `NUMERIC` para montos de dinero. Todas las cifras de capital, descuento, comisión y recaudo se almacenan en centavos de peso (`BIGINT`), garantizando exactitud contable absoluta:
- `$ 1.500.000 COP` se almacena como `150000000` (150 millones de centavos).

### 2.2. Clave Canónica Anti-Duplicado (`canonical_hmac`)
La columna `canonical_hmac VARCHAR(64)` en la tabla `operations` posee una restricción `UNIQUE`. El motor de PostgreSQL rechaza a nivel de base de datos cualquier intento de registrar una factura o hito con el mismo hash canónico, dando cumplimiento a la **Invariante I5**.

### 2.3. Herencia Funcional de Operaciones (Facturas vs. Hitos)
Se utiliza el patrón de tabla base (`operations`) con tablas de extensión 1:1 especializadas:
- `invoice_details`: CUFE, número de factura y banderas booleanas de los tres eventos RADIAN.
- `milestone_details`: UUID de contrato, índice del hito, enlace al entregable y token opaco de verificación para el cliente.

### 2.4. Tabla de Transactional Outbox
La tabla `outbox_events` almacena las operaciones pendientes de minteo, quema o liquidación on-chain. La inserción de estos registros ocurre en la misma transacción ACID de PostgreSQL que cambia el estado de la operación, garantizando entrega *at-least-once* sin inconsistencias de estado dual (*dual-write*).

