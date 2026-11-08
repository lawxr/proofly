/**
 * @proofly/domain - Entidad de Usuario / Freelancer / Financiador
 */

import { FreelancerTier } from '../reputation/tiers-policy.ts';

export const UserRole = {
  FREELANCER: 'FREELANCER',
  INVESTOR: 'INVESTOR',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const KycStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;

export type KycStatus = typeof KycStatus[keyof typeof KycStatus];

export interface UserProps {
  id: string;
  email: string;
  legalName: string;
  taxId: string;
  role: UserRole;
  kycStatus: KycStatus;
  passwordHash?: string;
  walletAddress?: string;
  tier?: FreelancerTier;
  availableLimitCents?: bigint;
  executionScore?: number;
  completedOperationsCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity {
  id: string;
  email: string;
  legalName: string;
  taxId: string;
  role: UserRole;
  kycStatus: KycStatus;
  passwordHash?: string;
  walletAddress?: string;
  tier?: FreelancerTier;
  availableLimitCents?: bigint;
  executionScore?: number;
  completedOperationsCount?: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.legalName = props.legalName;
    this.taxId = props.taxId;
    this.role = props.role;
    this.kycStatus = props.kycStatus;
    this.passwordHash = props.passwordHash;
    this.walletAddress = props.walletAddress;
    this.tier = props.tier;
    this.availableLimitCents = props.availableLimitCents;
    this.executionScore = props.executionScore;
    this.completedOperationsCount = props.completedOperationsCount ?? 0;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isKycVerified(): boolean {
    return this.kycStatus === KycStatus.VERIFIED;
  }
}
