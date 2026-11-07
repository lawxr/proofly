/**
 * @proofly/api - Adaptadores de Prueba y Sandbox para Integraciones Externas
 */

import type {
  InvoiceVerificationPort,
  MilestoneConfirmationPort,
  KycPort,
  PaymentRailPort,
  BlockchainPort,
  InvoiceValidationResult
} from '@proofly/domain';

export class SandboxInvoiceVerificationAdapter implements InvoiceVerificationPort {
  async verifyInvoice(xmlContent: string): Promise<InvoiceValidationResult> {
    if (!xmlContent || xmlContent.trim().length === 0) {
      return {
        isValid: false,
        events: [],
        rejectionReason: 'Contenido XML vacío o corrupto',
        payerNit: '',
        payerLegalName: '',
        nominalAmountCents: 0n,
        dueDate: ''
      };
    }

    // Simulación determinista: Si el XML contiene "REJECT", se simula factura no elegible
    if (xmlContent.includes('REJECT')) {
      return {
        isValid: false,
        events: ['030_RECEPCION'],
        rejectionReason: 'Factura sin evento 033 de aceptación tácita en RADIAN',
        payerNit: '900123456-1',
        payerLegalName: 'Empresa Deudora SAS',
        nominalAmountCents: 150000000n,
        dueDate: '2026-12-31'
      };
    }

    return {
      isValid: true,
      events: ['030_RECEPCION', '032_BIENES_SERVICIOS', '033_ACEPTACION_TACITA'],
      payerNit: '901234567-8',
      payerLegalName: 'Bancolombia S.A.',
      nominalAmountCents: 250000000n, // $ 2.500.000 COP
      dueDate: '2026-12-20'
    };
  }
}

export class SandboxMilestoneConfirmationAdapter implements MilestoneConfirmationPort {
  public dispatchedEmails: Array<{ email: string; token: string; title: string }> = [];

  async sendConfirmationLink(params: {
    email: string;
    token: string;
    milestoneTitle: string;
    nominalAmountCents: bigint;
  }): Promise<boolean> {
    this.dispatchedEmails.push({
      email: params.email,
      token: params.token,
      title: params.milestoneTitle
    });
    console.log(
      `[Sandbox Email] Despachado enlace seguro a ${params.email}: https://app.proofly.co/verify/${params.token}`
    );
    return true;
  }
}

export class SandboxKycAdapter implements KycPort {
  async verifyIdentity(params: {
    taxId: string;
    legalName: string;
  }): Promise<{ verified: boolean; riskScore: number }> {
    // Verificación sandbox determinista
    const verified = !params.taxId.startsWith('999');
    return {
      verified,
      riskScore: verified ? 95 : 20
    };
  }
}

export class SandboxPaymentRailAdapter implements PaymentRailPort {
  async disburseAdvance(params: {
    recipientAccount: string;
    amountCents: bigint;
    reference: string;
  }): Promise<{ transactionId: string; success: boolean }> {
    const txId = `SANDBOX-ACH-${Date.now()}`;
    console.log(
      `[Sandbox ACH] Desembolso de ${params.amountCents} centavos a cuenta ${params.recipientAccount} (Ref: ${params.reference})`
    );
    return {
      transactionId: txId,
      success: true
    };
  }
}

export class SandboxBlockchainAdapter implements BlockchainPort {
  async mintOperationTokens(params: {
    operationId: string;
    toAddress: string;
    amountTokens: bigint;
  }): Promise<{ txHash: string; success: boolean }> {
    const txHash = `0xmock${Date.now()}base${params.amountTokens}`;
    console.log(
      `[Sandbox EVM] Minteados ${params.amountTokens} tokens de op ${params.operationId} a ${params.toAddress}`
    );
    return {
      txHash,
      success: true
    };
  }

  async burnOperationTokens(params: {
    operationId: string;
    receiptHash: string;
  }): Promise<{ txHash: string; success: boolean }> {
    const txHash = `0xmockburn${Date.now()}`;
    console.log(
      `[Sandbox EVM] Quemados tokens de op ${params.operationId} con recibo bancario ${params.receiptHash}`
    );
    return {
      txHash,
      success: true
    };
  }
}

