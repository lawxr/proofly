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
  // Presentation metadata (not a financial invariant). The title is the user's
  // label for the deliverable; the rate is the quoted E.A. the UI displays.
  // Optional so the domain never requires them, but persisted when present.
  title?: string;
  effectiveAnnualRate?: number;
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
  title?: string;
  effectiveAnnualRate?: number;

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
    this.title = props.title;
    this.effectiveAnnualRate = props.effectiveAnnualRate;
  }

  isFullyFunded(): boolean {
    return this.fundedCapitalCents >= this.advanceAmountCents;
  }

  remainingFundingCents(): bigint {
    const diff = this.advanceAmountCents - this.fundedCapitalCents;
    return diff > 0n ? diff : 0n;
  }
}
