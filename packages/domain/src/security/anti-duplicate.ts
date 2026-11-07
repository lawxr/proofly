/**
 * @proofly/domain - AntiDuplicateService
 * Generación canónica de claves HMAC-SHA256 para facturas e hitos contractuales.
 */

import { createHmac } from 'node:crypto';

export interface CanonicalInvoiceData {
  cufe: string;
  issuerNit: string;
  payerNit: string;
  nominalAmountCents: bigint;
  dueDateUnix: number;
}

export interface CanonicalMilestoneData {
  contractUuid: string;
  milestoneIndex: number;
  payerId: string;
  nominalAmountCents: bigint;
  dueDateUnix: number;
}

export class AntiDuplicateService {
  private readonly serverSecret: string;

  constructor(serverSecret: string) {
    if (!serverSecret || serverSecret.length < 32) {
      throw new Error('SERVER_HMAC_SECRET must be at least 32 characters long.');
    }
    this.serverSecret = serverSecret;
  }

  public generateInvoiceHmac(data: CanonicalInvoiceData): string {
    const payload = [
      data.cufe.trim().toLowerCase(),
      data.issuerNit.replace(/\D/g, ''),
      data.payerNit.replace(/\D/g, ''),
      data.nominalAmountCents.toString(),
      data.dueDateUnix.toString()
    ].join('|');

    return createHmac('sha256', this.serverSecret).update(payload).digest('hex');
  }

  public generateMilestoneHmac(data: CanonicalMilestoneData): string {
    const payload = [
      data.contractUuid.trim().toLowerCase(),
      data.milestoneIndex.toString(),
      data.payerId.replace(/\D/g, ''),
      data.nominalAmountCents.toString(),
      data.dueDateUnix.toString()
    ].join('|');

    return createHmac('sha256', this.serverSecret).update(payload).digest('hex');
  }
}
