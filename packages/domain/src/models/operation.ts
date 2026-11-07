/**
 * @proofly/domain - Entidad de Operación
 */

import { OperationState } from '../state/operation-state.ts';

export const AssetType = {
  INVOICE: 'INVOICE',
  MILESTONE: 'MILESTONE',
} as const;

export type AssetType = typeof AssetType[keyof typeof AssetType];

export interface OperationProps {
  id: string;
  freelancerId: string;
  payerNit: string;
  payerLegalName: string;
  assetType: AssetType;
  nominalAmountCents: bigint;
  termDays: number;
  dueDate: string;
  advanceAmountCents: bigint;
  commercialDiscountCents: bigint;
  prooflyFeeCents: bigint;
  fundedCapitalCents: bigint;
  status: OperationState;
  hmacKey: string;
  confirmationToken?: string;
  electronicSignatureHash?: string;
  payerSolvencyScore?: number;
  freelancerExecutionScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class OperationEntity {
  id: string;
  freelancerId: string;
  payerNit: string;
  payerLegalName: string;
  assetType: AssetType;
  nominalAmountCents: bigint;
  termDays: number;
  dueDate: string;
  advanceAmountCents: bigint;
  commercialDiscountCents: bigint;
  prooflyFeeCents: bigint;
  fundedCapitalCents: bigint;
  status: OperationState;
  hmacKey: string;
  confirmationToken?: string;
  electronicSignatureHash?: string;
  payerSolvencyScore?: number;
  freelancerExecutionScore?: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: OperationProps) {
    this.id = props.id;
    this.freelancerId = props.freelancerId;
    this.payerNit = props.payerNit;
    this.payerLegalName = props.payerLegalName;
    this.assetType = props.assetType;
    this.nominalAmountCents = props.nominalAmountCents;
    this.termDays = props.termDays;
    this.dueDate = props.dueDate;
    this.advanceAmountCents = props.advanceAmountCents;
    this.commercialDiscountCents = props.commercialDiscountCents;
    this.prooflyFeeCents = props.prooflyFeeCents;
    this.fundedCapitalCents = props.fundedCapitalCents;
    this.status = props.status;
    this.hmacKey = props.hmacKey;
    this.confirmationToken = props.confirmationToken;
    this.electronicSignatureHash = props.electronicSignatureHash;
    this.payerSolvencyScore = props.payerSolvencyScore;
    this.freelancerExecutionScore = props.freelancerExecutionScore;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isFullyFunded(): boolean {
    return this.fundedCapitalCents >= this.advanceAmountCents;
  }

  remainingFundingCents(): bigint {
    const diff = this.advanceAmountCents - this.fundedCapitalCents;
    return diff > 0n ? diff : 0n;
  }
}
