/**
 * @proofly/domain - Puertos de Servicios Externos (Facturación, Hitos, KYC, Pasarela, Blockchain)
 */

export interface InvoiceValidationResult {
  isValid: boolean;
  events: string[];
  rejectionReason?: string;
  payerNit: string;
  payerLegalName: string;
  nominalAmountCents: bigint;
  dueDate: string;
}

export interface InvoiceVerificationPort {
  verifyInvoice(xmlContent: string): Promise<InvoiceValidationResult>;
}

export interface MilestoneConfirmationPort {
  sendConfirmationLink(params: {
    email: string;
    token: string;
    milestoneTitle: string;
    nominalAmountCents: bigint;
  }): Promise<boolean>;
}

export interface KycPort {
  verifyIdentity(params: {
    taxId: string;
    legalName: string;
  }): Promise<{ verified: boolean; riskScore: number }>;
}

export interface PaymentRailPort {
  disburseAdvance(params: {
    recipientAccount: string;
    amountCents: bigint;
    reference: string;
  }): Promise<{ transactionId: string; success: boolean }>;
}

export interface BlockchainPort {
  mintOperationTokens(params: {
    operationId: string;
    toAddress: string;
    amountTokens: bigint;
  }): Promise<{ txHash: string; success: boolean }>;

  burnOperationTokens(params: {
    operationId: string;
    receiptHash: string;
  }): Promise<{ txHash: string; success: boolean }>;

  /**
   * Abre la operación en el vault mUSDC. `fundingTargetCents` es el adelanto que
   * deben aportar los financiadores. Idempotente: si ya está abierta con la misma
   * meta devuelve `alreadyOpen`; si la meta difiere, falla sin escribir.
   */
  openOperationTokens?(params: {
    operationId: string;
    fundingTargetCents: bigint;
  }): Promise<{ txHash: string; success: boolean; tokenId?: bigint; alreadyOpen?: boolean; permanent?: boolean }>;

  /**
   * Registra el recaudo en el vault. `receivedUsdc` es capital + ganancia de los
   * financiadores. Idempotente: si ya está liquidada con la misma prueba,
   * devuelve `alreadySettled`.
   */
  /**
   * Habilita una wallet de demo: KYC on-chain y, si le falta, mUSDC de prueba y
   * un poco de ETH para el gas. Idempotente: no repite lo que ya tiene.
   */
  onboardDemoWallet?(params: {
    walletAddress: string;
    minUsdcUnits: bigint;
    mintUsdcUnits: bigint;
    minEthWei: bigint;
    topUpEthWei: bigint;
  }): Promise<{ success: boolean; actions: string[]; txHashes: string[]; detail?: string; permanent?: boolean }>;

  fundAndSettleOperation?(params: {
    operationId: string;
    receiptHash: string;
    receivedUsdc: bigint;
  }): Promise<{ txHash: string; success: boolean; tokenId?: bigint; alreadySettled?: boolean; permanent?: boolean }>;
}

