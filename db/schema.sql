-- ============================================================================
-- PROOFLY - ESQUEMA DE BASE DE DATOS OPERACIONAL (PostgreSQL 16)
-- Archivo: db/schema.sql
-- ============================================================================
-- Principios:
-- 1. Identificadores universales UUID v4
-- 2. Montos monetarios estrictamente en centavos de COP (BIGINT)
-- 3. Marcas de tiempo completas con zona horaria (TIMESTAMPTZ)
-- 4. Invariante anti-duplicado por HMAC UNIQUE
-- 5. Patrón Transactional Outbox para resiliencia blockchain
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUMS DEL DOMINIO
-- ----------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
    'FREELANCER',
    'FINANCIER',
    'CLIENT_PAYER',
    'OPERATOR',
    'ADMIN'
);

CREATE TYPE kyc_status AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED',
    'SUSPENDED'
);

CREATE TYPE freelancer_tier AS ENUM (
    'TIER_1_SEED',       -- Hasta 2M COP, 1 op activa
    'TIER_2_GROWTH',     -- Hasta 8M COP, 2 ops activas
    'TIER_3_PRO'         -- Hasta 25M COP, 3 ops activas
);

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

CREATE TYPE outbox_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);

-- ----------------------------------------------------------------------------
-- 2. USUARIOS Y PERFILES
-- ----------------------------------------------------------------------------

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    phone_number VARCHAR(30),
    wallet_address CHAR(42), -- 0x... en Base L2 (abstraída o externa)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE kyc_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(10) NOT NULL, -- CC, CE, NIT, PASSPORT
    document_number VARCHAR(30) NOT NULL,
    status kyc_status NOT NULL DEFAULT 'PENDING',
    risk_score INT, -- 0 a 100
    sanctions_cleared BOOLEAN NOT NULL DEFAULT FALSE,
    external_provider_id VARCHAR(100),
    rejection_reason TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_kyc_document UNIQUE (document_type, document_number)
);

CREATE TABLE freelancer_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tier freelancer_tier NOT NULL DEFAULT 'TIER_1_SEED',
    current_quota_cents BIGINT NOT NULL DEFAULT 200000000, -- $ 2.000.000 COP iniciales
    available_quota_cents BIGINT NOT NULL DEFAULT 200000000,
    execution_score INT NOT NULL DEFAULT 70, -- 0 a 100
    successful_operations_count INT NOT NULL DEFAULT 0,
    dispute_count INT NOT NULL DEFAULT 0,
    portfolio_url TEXT,
    github_profile VARCHAR(100),
    linkedin_profile VARCHAR(100),
    bank_name VARCHAR(100),
    bank_account_type VARCHAR(20),
    bank_account_number VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nit VARCHAR(20) NOT NULL UNIQUE,
    legal_name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(30),
    credit_score INT NOT NULL DEFAULT 75, -- 0 a 100
    is_dian_active BOOLEAN NOT NULL DEFAULT TRUE,
    total_financed_cents BIGINT NOT NULL DEFAULT 0,
    defaulted_operations_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. OPERACIONES (FACTURAS E HITOS)
-- ----------------------------------------------------------------------------

CREATE TABLE operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_hmac VARCHAR(64) NOT NULL UNIQUE, -- Invariante I5
    freelancer_id UUID NOT NULL REFERENCES users(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    operation_type operation_type NOT NULL,
    status operation_status NOT NULL DEFAULT 'DRAFT',
    
    -- Magnitudes financieras en centavos enteros (Invariante I9)
    nominal_amount_cents BIGINT NOT NULL,
    discount_amount_cents BIGINT NOT NULL,
    proofly_fee_cents BIGINT NOT NULL,
    advance_amount_cents BIGINT NOT NULL,
    funded_amount_cents BIGINT NOT NULL DEFAULT 0,
    reconciled_amount_cents BIGINT NOT NULL DEFAULT 0,
    
    -- Parámetros temporales y tasas
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    term_days INT NOT NULL,
    monthly_discount_rate NUMERIC(6, 4) NOT NULL, -- ej. 0.0175
    effective_annual_rate NUMERIC(6, 4) NOT NULL, -- ej. 0.2363 (23.63 % E.A.)
    
    -- Trazabilidad de Dossier y On-Chain
    dossier_hash CHAR(64), -- SHA-256 del paquete documental
    onchain_token_id BIGINT, -- ID del token ERC-1155 en Base
    mint_tx_hash VARCHAR(66),
    settle_tx_hash VARCHAR(66),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_positive_nominal CHECK (nominal_amount_cents > 0),
    CONSTRAINT chk_valid_advance CHECK (advance_amount_cents = nominal_amount_cents - discount_amount_cents - proofly_fee_cents),
    CONSTRAINT chk_future_due_date CHECK (due_date >= issue_date)
);

CREATE TABLE invoice_details (
    operation_id UUID PRIMARY KEY REFERENCES operations(id) ON DELETE CASCADE,
    cufe CHAR(64) NOT NULL UNIQUE,
    invoice_number VARCHAR(50) NOT NULL,
    xml_s3_key TEXT,
    has_receipt_acknowledgement BOOLEAN NOT NULL DEFAULT FALSE,
    has_goods_services_received BOOLEAN NOT NULL DEFAULT FALSE,
    has_express_tacit_acceptance BOOLEAN NOT NULL DEFAULT FALSE,
    radian_verified_at TIMESTAMPTZ
);

CREATE TABLE milestone_details (
    operation_id UUID PRIMARY KEY REFERENCES operations(id) ON DELETE CASCADE,
    contract_uuid UUID NOT NULL,
    milestone_index INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    deliverable_url TEXT NOT NULL,
    confirmation_secure_token VARCHAR(64) NOT NULL UNIQUE,
    token_expires_at TIMESTAMPTZ NOT NULL,
    confirmed_by_client_at TIMESTAMPTZ,
    client_ip VARCHAR(45),
    CONSTRAINT uq_contract_milestone UNIQUE (contract_uuid, milestone_index)
);

-- ----------------------------------------------------------------------------
-- 4. MARKETPLACE Y PARTICIPACIONES DE FINANCIADORES
-- ----------------------------------------------------------------------------

CREATE TABLE participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE RESTRICT,
    financier_id UUID NOT NULL REFERENCES users(id),
    
    -- Montos en centavos enteros
    funded_capital_cents BIGINT NOT NULL,      -- Capital aportado K_i
    expected_yield_cents BIGINT NOT NULL,      -- Ganancia neta pactada G_i
    nominal_share_cents BIGINT NOT NULL,       -- V_n proporcional a recibir
    settled_capital_cents BIGINT NOT NULL DEFAULT 0,
    settled_yield_cents BIGINT NOT NULL DEFAULT 0,
    
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_participation_positive CHECK (funded_capital_cents > 0),
    CONSTRAINT chk_nominal_share CHECK (nominal_share_cents = funded_capital_cents + expected_yield_cents)
);

CREATE TABLE financier_balances (
    financier_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    available_balance_cents BIGINT NOT NULL DEFAULT 0,
    invested_capital_cents BIGINT NOT NULL DEFAULT 0,
    accumulated_yield_cents BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_non_negative_balance CHECK (available_balance_cents >= 0)
);

-- ----------------------------------------------------------------------------
-- 5. RECAUDO BANCARIO Y LIQUIDACIÓN (WATERFALL)
-- ----------------------------------------------------------------------------

CREATE TABLE bank_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID NOT NULL REFERENCES operations(id),
    bank_reference VARCHAR(100) NOT NULL UNIQUE,
    received_amount_cents BIGINT NOT NULL,
    bank_account_dest VARCHAR(50) NOT NULL,
    payment_method VARCHAR(30) NOT NULL, -- PSE, ACH, WIRE
    payer_source_nit VARCHAR(20) NOT NULL,
    receipt_proof_hash CHAR(64) NOT NULL, -- Hash SHA-256 del extracto
    received_at TIMESTAMPTZ NOT NULL,
    reconciled_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settlement_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_receipt_id UUID NOT NULL REFERENCES bank_receipts(id),
    operation_id UUID NOT NULL REFERENCES operations(id),
    financier_id UUID NOT NULL REFERENCES users(id),
    participation_id UUID NOT NULL REFERENCES participations(id),
    
    -- Distribución exacta con Algoritmo del Mayor Resto (Invariante I9)
    capital_paid_cents BIGINT NOT NULL,
    yield_paid_cents BIGINT NOT NULL,
    proofly_fee_paid_cents BIGINT NOT NULL DEFAULT 0,
    distributed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. SINCRONIZACIÓN BLOCKCHAIN (TRANSACTIONAL OUTBOX)
-- ----------------------------------------------------------------------------

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status outbox_status NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error_log TEXT,
    tx_hash VARCHAR(66),
    block_number BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ
);

CREATE TABLE indexed_chain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_address CHAR(42) NOT NULL,
    event_name VARCHAR(50) NOT NULL,
    tx_hash CHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    block_hash CHAR(66) NOT NULL,
    event_payload JSONB NOT NULL,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tx_event UNIQUE (tx_hash, event_name, block_number)
);

-- ----------------------------------------------------------------------------
-- 7. ÍNDICES DE RENDIMIENTO
-- ----------------------------------------------------------------------------

CREATE INDEX idx_operations_status ON operations(status);
CREATE INDEX idx_operations_freelancer ON operations(freelancer_id);
CREATE INDEX idx_operations_company ON operations(company_id);
CREATE INDEX idx_operations_due_date ON operations(due_date);
CREATE INDEX idx_participations_operation ON participations(operation_id);
CREATE INDEX idx_participations_financier ON participations(financier_id);
CREATE INDEX idx_outbox_pending ON outbox_events(status, next_retry_at) WHERE status = 'PENDING';
CREATE INDEX idx_indexed_events_block ON indexed_chain_events(block_number);

