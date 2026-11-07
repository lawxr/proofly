# Especificación de Puertos y Adaptadores — Proofly (`docs/architecture/03-ports-adapters.md`)

Este documento especifica formalmente los contratos de interfaz de los Puertos de Dominio de **Proofly** y describe la arquitectura de inyección de dependencias para alternar limpiamente entre el entorno **Sandbox** (Base Sepolia + adaptadores Mock) y el entorno de **Producción** (Base Mainnet + integraciones reales) sin modificar una sola línea de código fuente.

---

## 1. Principio de Conmutabilidad por Configuración

Cada puerto define un contrato TypeScript puro alojado en `packages/domain`. La aplicación NestJS (`apps/api`) y el Worker (`apps/worker`) resuelven dinámicamente la implementación adecuada al iniciar el proceso basándose en la variable de entorno tipada `ENV_MODE`:

```typescript
export type EnvironmentMode = 'sandbox' | 'production';
```

---

## 2. Catálogo de Puertos e Interfaces de Dominio

### 2.1. `InvoiceVerificationPort` (Verificación de Facturas Electrónicas)
Valida la autenticidad del documento XML UBL 2.1 y consulta el estado del título valor y sus acuses obligatorios en el registro RADIAN/DIAN.

```typescript
export interface InvoiceVerificationResult {
  isValid: boolean;
  cufe: string;
  issuerNit: string;
  payerNit: string;
  nominalAmountCents: bigint;
  issueDate: Date;
  dueDate: Date;
  hasReceiptAcknowledgement: boolean;  // Acuse de recibo de factura
  hasGoodsServicesReceived: boolean;    // Recibo de bienes o prestación de servicios
  hasExpressOrTacitAcceptance: boolean; // Aceptación expresa o tácita
  rejectionReason?: string;
}

export interface InvoiceVerificationPort {
  verifyInvoiceXml(xmlBuffer: Buffer): Promise<InvoiceVerificationResult>;
  checkRadianStatus(cufe: string): Promise<InvoiceVerificationResult>;
}
```
* **Adaptador Sandbox (`MockRadianAdapter`):** Analiza el XML sintácticamente o utiliza una semilla determinista basada en el CUFE; simula los tres eventos del RADIAN para pruebas continuas sin conexión externa.
* **Adaptador de Producción (`DianRadianHttpAdapter`):** Se comunica vía mTLS / REST con el proveedor tecnológico autorizado (PTA) o la API oficial de la DIAN para verificar el estado vinculante del título valor en Colombia.

---

### 2.2. `MilestoneConfirmationPort` (Confirmación de Hitos por Clientes)
Gestiona la emisión y verificación del enlace seguro para que la empresa contratante confirme entregables sin necesidad de crear cuenta previa en la plataforma.

```typescript
export interface MilestoneVerificationToken {
  token: string;
  milestoneId: string;
  payerEmail: string;
  expiresAt: Date;
}

export interface MilestoneConfirmationPort {
  generateSecureToken(milestoneId: string, payerEmail: string): Promise<string>;
  validateToken(token: string): Promise<{ isValid: boolean; milestoneId?: string }>;
  sendConfirmationRequest(params: {
    token: string;
    payerEmail: string;
    freelancerName: string;
    milestoneTitle: string;
    deliverableUrl: string;
    amountCents: bigint;
  }): Promise<{ sent: boolean; messageId: string }>;
}
```
* **Adaptador Sandbox (`ConsoleMailMilestoneAdapter`):** Genera tokens deterministas en memoria y registra el enlace de confirmación en el log de consola (`http://localhost:3000/verify/[token]`).
* **Adaptador de Producción (`SendGridSmsMilestoneAdapter`):** Despacha correos transaccionales certificados vía SendGrid/Postmark y SMS mediante Twilio con tokens criptográficamente seguros (HMAC-SHA256 con tiempo de expiración).

---

### 2.3. `KycPort` (Identidad y Listas Restrictivas)
Orquesta la validación de identidad y verificación de antecedentes en listas de control financiero (SARLAFT/OFAC).

```typescript
export interface KycValidationRequest {
  userId: string;
  documentType: 'CC' | 'CE' | 'NIT' | 'PASSPORT';
  documentNumber: string;
  fullName: string;
  birthDate?: string;
  selfieImageBuffer?: Buffer;
  documentFrontBuffer?: Buffer;
}

export interface KycValidationResult {
  status: 'VERIFIED' | 'REJECTED' | 'MANUAL_REVIEW';
  riskScore: number; // 0 a 100
  sanctionsMatch: boolean;
  verificationId: string;
  reason?: string;
}

export interface KycPort {
  verifyIdentity(request: KycValidationRequest): Promise<KycValidationResult>;
}
```
* **Adaptador Sandbox (`DeterministicMockKycAdapter`):** Aprueba instantáneamente cualquier documento que termine en número par y envía a revisión manual los impares; permite emular fallos de cumplimiento en tests.
* **Adaptador de Producción (`TruoraKycAdapter` / `MetaMapAdapter`):** Validación biométrica facial, lectura OCR de cédula colombiana y cruce en tiempo real con más de 100 listas restrictivas locales e internacionales.

---

### 2.4. `ReputationScoringPort` (Calificación Dual de Riesgo)
Calcula el Score de Ejecución del Freelancer y el Score de Solvencia de la Empresa Contratante.

```typescript
export interface ReputationScores {
  freelancerScore: number;     // 0 a 100
  freelancerTier: 1 | 2 | 3;
  companyScore: number;        // 0 a 100
  combinedScore: number;       // 0 a 100
  suggestedDiscountBps: number; // Puntos básicos de descuento sugeridos
  maxAllowedAdvanceCents: bigint;
}

export interface ReputationScoringPort {
  calculateScores(params: {
    freelancerId: string;
    companyNit: string;
    requestedAmountCents: bigint;
  }): Promise<ReputationScores>;
}
```
* **Adaptador Sandbox (`HeuristicScoringAdapter`):** Calcula los puntajes mediante una función pura basada en el número de operaciones exitosas registradas en la base de datos local de pruebas.
* **Adaptador de Producción (`HybridBureauScoringAdapter`):** Combina el motor heurístico interno con consultas a centrales de riesgo (Experian / TransUnion Colombia) para evaluar la probabilidad de mora del pagador.

---

### 2.5. `PaymentRailPort` (Dispersión y Recaudo Bancario)
Maneja la dispersión de fondos a las cuentas bancarias de los freelancers y la recepción de recaudos de las empresas contratantes.

```typescript
export interface DisburseFundsRequest {
  operationId: string;
  recipientBankCode: string;
  recipientAccountNumber: string;
  recipientAccountType: 'CHECKING' | 'SAVINGS';
  recipientDocument: string;
  recipientName: string;
  amountCents: bigint;
}

export interface DisburseFundsResult {
  success: boolean;
  transferReference: string;
  settledAt?: Date;
  errorCode?: string;
}

export interface PaymentRailPort {
  disburseAdvance(request: DisburseFundsRequest): Promise<DisburseFundsResult>;
  checkReceiptStatus(bankReference: string): Promise<{ confirmed: boolean; amountCents: bigint }>;
}
```
* **Adaptador Sandbox (`MemoryPaymentRailAdapter`):** Confirma las transferencias en 200 ms y genera referencias bancarias simuladas; emite eventos inmediatos de confirmación.
* **Adaptador de Producción (`WompiPsePaymentAdapter` / `BankTransferAdapter`):** Conecta vía API con pasarelas de pago y convenios fiduciarios bancarios en Colombia (transferencias ACH y dispersión Transfiya).

---

### 2.6. `ChainGatewayPort` (Interacción con la Blockchain Base)
Encapsula la firma y el despacho de transacciones hacia la red Base L2, así como la consulta de eventos indexados.

```typescript
export interface MintOperationOnChainParams {
  operationId: string;
  canonicalHmac: string;
  nominalAmountCents: bigint;
  dueDateUnix: number;
  participations: Array<{ financierWallet: `0x${string}`; shareAmountCents: bigint }>;
}

export interface SettleOperationOnChainParams {
  operationId: string;
  receiptProofHash: `0x${string}`;
  settledAmountCents: bigint;
}

export interface ChainGatewayPort {
  mintOperation(params: MintOperationOnChainParams): Promise<{ txHash: `0x${string}`; blockNumber: bigint }>;
  settleOperation(params: SettleOperationOnChainParams): Promise<{ txHash: `0x${string}`; blockNumber: bigint }>;
  isKycActive(walletAddress: `0x${string}`): Promise<boolean>;
  syncKycStatus(walletAddress: `0x${string}`, isActive: boolean): Promise<{ txHash: `0x${string}` }>;
}
```
* **Adaptador Sandbox (`AnvilSepoliaChainAdapter`):** Se conecta a un nodo local Anvil o a Base Sepolia testnet usando cuentas de prueba con fondos mock.
* **Adaptador de Producción (`BaseMainnetViemAdapter`):** Utiliza `viem` con firma delegada en AWS KMS / CloudHSM, optimización dinámica de gas EIP-1559 y monitoreo de 12 confirmaciones de bloque en Base Mainnet.

---

## 3. Matriz de Configuración de Adaptadores por Entorno

| Puerto | Variable de Entorno | Implementación en `sandbox` | Implementación en `production` |
| :--- | :--- | :--- | :--- |
| `InvoiceVerificationPort` | `INVOICE_ADAPTER` | `MockRadianAdapter` | `DianRadianHttpAdapter` |
| `MilestoneConfirmationPort`| `MILESTONE_ADAPTER` | `ConsoleMailMilestoneAdapter` | `SendGridSmsMilestoneAdapter` |
| `KycPort` | `KYC_ADAPTER` | `DeterministicMockKycAdapter` | `TruoraKycAdapter` |
| `ReputationScoringPort` | `SCORING_ADAPTER` | `HeuristicScoringAdapter` | `HybridBureauScoringAdapter` |
| `PaymentRailPort` | `PAYMENT_ADAPTER` | `MemoryPaymentRailAdapter` | `WompiPsePaymentAdapter` |
| `ChainGatewayPort` | `CHAIN_ADAPTER` | `AnvilSepoliaChainAdapter` | `BaseMainnetViemAdapter` |

