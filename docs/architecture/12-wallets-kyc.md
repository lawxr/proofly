# Gestión de Wallets Abstraídas y Sincronización KYC — Proofly (`docs/architecture/12-wallets-kyc.md`)

Este documento especifica la arquitectura de **Abstracción de Cuentas (Account Abstraction)** y el ciclo de vida de **Verificación y Sincronización KYC** en **Proofly**, dando cumplimiento a la **Invariante I7 (Transferencias Restringidas por Cumplimiento)** y permitiendo una experiencia de usuario neobank 100 % Web2.

---

## 1. Abstracción de Wallets (Web2 UX)

### 1.1. El Problema de la Fricción Cripto Tradicional
Exigir a freelancers o financiadores que instalen extensiones de navegador (MetaMask), anoten frases semilla de 12 palabras o adquieran Ether (ETH) para pagar comisiones de red (*gas fees*) destruye la tasa de conversión y genera abandono masivo.

### 1.2. Solución Arquitectónica
Proofly implementa **Wallets Abstraídas Gestionadas** respaldadas por un Servicio de Custodia Segura en Backend (KMS / HSM) o Smart Accounts ERC-4337 con **Patrocinio de Gas (Paymaster)**:
* Al registrarse el usuario con su correo electrónico, el backend genera de forma determinista una dirección de billetera EVM vinculada a su `user_id`.
* La firma de transacciones de plataforma es realizada por la infraestructura de Proofly.
* Las comisiones de gas en Base L2 son patrocinadas íntegramente por la plataforma y asumidas dentro del fee operativo de Proofly.
* **Resultado para el Usuario:** Una experiencia idéntica a una aplicación de banca móvil moderna (Neobank) en pesos colombianos (COP), con biometría o PIN como factor de autorización.

---

## 2. Flujo de Onboarding y Sincronización KYC

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario (Freelancer o Financiador)
    participant UI as Web/Mobile App
    participant API as API Core (NestJS)
    participant KYC as Proveedor KYC (Truora/MetaMap)
    participant DB as PostgreSQL
    participant Worker as Blockchain Worker
    participant Registry as ProoflyKYCRegistry (Base L2)

    User->>UI: Sube documento de identidad y selfie biométrica
    UI->>API: POST /api/v1/kyc/verify
    API->>KYC: Validar documento + biometría + listas restrictivas
    KYC-->>API: KYC Aprobado (status: VERIFIED, score: 95)
    API->>DB: Actualizar kyc_verifications y asignar wallet_address
    API->>DB: Insertar evento SYNC_KYC_STATUS en outbox_events
    API-->>UI: Verificación exitosa; cuenta activada
    
    Worker->>DB: Detecta evento SYNC_KYC_STATUS pendiente
    Worker->>Registry: setKycStatus(userWalletAddress, true)
    Registry-->>Worker: Tx confirmada (KycStatusUpdated emitido)
    Worker->>DB: Marcar outbox como COMPLETED
```

---

## 3. Seguridad de Claves y Protección de Fondos

1. **Segregación de Roles:**
   - La clave privada del operador (`OPERATOR_ROLE`) reside en **AWS KMS / HashiCorp Vault** con políticas de acceso IAM estrictas y autenticación mutua (mTLS).
   - Ningún desarrollador ni administrador tiene acceso en texto plano a las claves maestras de firma.
2. **Revocación Automática de Cumplimiento:**
   - Si un usuario es reportado posteriormente en listas restrictivas o se detecta fraude en una auditoría, el sistema revoca inmediatamente su estado en base de datos y despacha una transacción `setKycStatus(wallet, false)` a `ProoflyKYCRegistry`, bloqueando instantáneamente cualquier recepción o transferencia de tokens on-chain.

