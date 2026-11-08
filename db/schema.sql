-- ============================================================================
-- PROOFLY - ESQUEMA DE BASE DE DATOS OPERACIONAL (PostgreSQL 16)
-- Archivo: db/schema.sql
-- ============================================================================
-- Reconciliado con el dominio canónico (packages/domain) y los repositorios
-- Postgres (apps/api/src/adapters/postgres). El dominio es la fuente de verdad:
-- este esquema refleja exactamente lo que las entidades definen y lo que los
-- repositorios escriben y leen, para evitar migraciones posteriores.
--
-- Principios:
-- 1. Identificadores UUID (los IDs del dominio son strings arbitrarios).
-- 2. Montos monetarios estrictamente en centavos de COP (BIGINT).
-- 3. Marcas de tiempo completas con zona horaria (TIMESTAMPTZ).
-- 4. Invariante anti-duplicado por HMAC UNIQUE.
-- 5. Patrón Transactional Outbox para resiliencia blockchain.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUMS DEL DOMINIO (alineados con packages/domain)
-- ----------------------------------------------------------------------------

-- UserRole del dominio: FREELANCER | INVESTOR | ADMIN.
-- El repositorio mapea INVESTOR <-> FINANCIER para conservar el término de negocio.
CREATE TYPE user_role AS ENUM (
    'FREELANCER',
    'FINANCIER',
    'ADMIN'
);

CREATE TYPE kyc_status AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED'
);

CREATE TYPE freelancer_tier AS ENUM (
    'TIER_1_SEED',
    'TIER_2_GROWTH',
    'TIER_3_PRO'
);

-- AssetType del dominio, persistido como operation_type en el repositorio.
CREATE TYPE operation_type AS ENUM (
    'ELECTRONIC_INVOICE',
    'CONTRACT_MILESTONE'
);

CREATE TYPE operation_status AS ENUM (
    'DRAFT',
    'PENDING_CLIENT_CONFIRMATION',
    'PENDING_VERIFICATION',
    'QUOTED',
    'APPROVED_PENDING_FUNDING',
    'ACTIVE_FUNDED',
    'DISBURSED',
    'SETTLED',
    'PARTIALLY_SETTLED_OVERDUE',
    'REJECTED_CANCELLED'
);

CREATE TYPE investment_status AS ENUM (
    'CONFIRMED',
    'SETTLED',
    'CANCELLED'
);

CREATE TYPE outbox_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);

-- ----------------------------------------------------------------------------
-- 2. USUARIOS (UserEntity del dominio, en una sola tabla)
-- ----------------------------------------------------------------------------
-- Una sola identidad por persona: puede anticipar (freelancer) e invertir
-- (financiador) a la vez. Los campos de cupo/tier/score aplican al lado de
-- anticipo; son NULL para quien aún no opera como freelancer.
--
-- password_hash es NULLABLE a propósito: hoy el acceso es por PIN único y las
-- cuentas reales con contraseña llegan en la siguiente rebanada (auth). Dejar
-- la columna desde ahora evita una migración posterior.

CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    legal_name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(40) NOT NULL,
    role user_role NOT NULL,
    kyc_status kyc_status NOT NULL DEFAULT 'PENDING',
    password_hash TEXT,
    wallet_address CHAR(42),
    tier freelancer_tier,
    available_quota_cents BIGINT,
    execution_score INT,
    completed_operations_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_execution_score CHECK (execution_score IS NULL OR (execution_score BETWEEN 0 AND 100)),
    CONSTRAINT chk_available_quota CHECK (available_quota_cents IS NULL OR available_quota_cents >= 0)
);

CREATE INDEX idx_users_email ON users(email);

-- ----------------------------------------------------------------------------
-- 3. OPERACIONES (OperationEntity del dominio)
-- ----------------------------------------------------------------------------
-- El pagador se guarda desnormalizado (payer_nit, payer_legal_name) tal como lo
-- maneja el dominio hoy; no hay tabla de empresas separada todavía.

CREATE TABLE operations (
    id VARCHAR(64) PRIMARY KEY,
    freelancer_id VARCHAR(64) NOT NULL REFERENCES users(id),
    asset_type operation_type NOT NULL,
    payer_nit VARCHAR(20) NOT NULL,
    payer_legal_name VARCHAR(255) NOT NULL,

    -- Magnitudes financieras en centavos enteros
    nominal_amount_cents BIGINT NOT NULL,
    advance_amount_cents BIGINT NOT NULL,
    commercial_discount_cents BIGINT NOT NULL,
    platform_fee_cents BIGINT NOT NULL,
    funded_capital_cents BIGINT NOT NULL DEFAULT 0,

    term_days INT NOT NULL,
    due_date DATE NOT NULL,
    status operation_status NOT NULL DEFAULT 'DRAFT',

    -- Anti-duplicado e integridad
    canonical_hmac VARCHAR(64) NOT NULL UNIQUE,
    confirmation_token VARCHAR(64) UNIQUE,
    electronic_signature_hash VARCHAR(80),

    -- Puntuaciones de riesgo separadas
    payer_solvency_score INT,
    freelancer_execution_score INT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_positive_nominal CHECK (nominal_amount_cents > 0),
    CONSTRAINT chk_valid_advance CHECK (advance_amount_cents = nominal_amount_cents - commercial_discount_cents - platform_fee_cents),
    CONSTRAINT chk_funded_non_negative CHECK (funded_capital_cents >= 0)
);

CREATE INDEX idx_operations_status ON operations(status);
CREATE INDEX idx_operations_freelancer ON operations(freelancer_id);
CREATE INDEX idx_operations_due_date ON operations(due_date);

-- ----------------------------------------------------------------------------
-- 4. PARTICIPACIONES DE FINANCIADORES (InvestmentEntity del dominio)
-- ----------------------------------------------------------------------------
-- 1 token ERC-1155 = 1 centavo de COP (tokens_count == funded_capital_cents).

CREATE TABLE investments (
    id VARCHAR(64) PRIMARY KEY,
    operation_id VARCHAR(64) NOT NULL REFERENCES operations(id) ON DELETE RESTRICT,
    financier_id VARCHAR(64) NOT NULL REFERENCES users(id),
    funded_capital_cents BIGINT NOT NULL,
    tokens_count BIGINT NOT NULL,
    status investment_status NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_investment_positive CHECK (funded_capital_cents > 0)
);

CREATE INDEX idx_investments_operation ON investments(operation_id);
CREATE INDEX idx_investments_financier ON investments(financier_id);

-- ----------------------------------------------------------------------------
-- 5. SINCRONIZACIÓN BLOCKCHAIN (TRANSACTIONAL OUTBOX, ADR-0004)
-- ----------------------------------------------------------------------------
-- Compartido entre apps/api (productor) y apps/worker (consumidor con SKIP LOCKED).

CREATE TABLE outbox_events (
    id VARCHAR(64) PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status outbox_status NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    tx_hash VARCHAR(66),
    block_number BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_pending ON outbox_events(status, created_at) WHERE status = 'PENDING';
