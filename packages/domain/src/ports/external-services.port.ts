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
}

