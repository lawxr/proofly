/**
 * @proofly/domain - Casos de uso de autenticación (registro e inicio de sesión).
 *
 * Usuarios reales persistidos. Una sola identidad por persona que puede
 * anticipar (freelancer) e invertir (financiador). El registro crea la cuenta
 * con tier semilla y KYC pendiente; el login verifica la contraseña.
 */

import { UserEntity, UserRole, KycStatus } from '../models/user.ts';
import { FreelancerTier, TiersPolicy } from '../reputation/tiers-policy.ts';
import { hashPassword, verifyPassword } from '../security/password.ts';
import type { UserRepositoryPort } from '../ports/user-repository.port.ts';
import type { KycPort } from '../ports/external-services.port.ts';

export interface RegisterUserDto {
  email: string;
  taxId: string;
  password: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A provisional display name from the email local-part, until KYC provides the
// legal name. e.g. "ana.ruiz" -> "Ana Ruiz".
function provisionalName(email: string): string {
  const local = email.split('@')[0] || 'Usuario';
  const words = local.split(/[._-]+/).filter(Boolean).slice(0, 3)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.join(' ') || 'Usuario';
}

export class RegisterUserUseCase {
  userRepo: UserRepositoryPort;
  newId: () => string;

  constructor(userRepo: UserRepositoryPort, newId: () => string = () => crypto.randomUUID()) {
    this.userRepo = userRepo;
    this.newId = newId;
  }

  async execute(dto: RegisterUserDto): Promise<UserEntity> {
    const email = dto.email?.trim().toLowerCase();
    const taxId = dto.taxId?.trim();
    if (!email || !EMAIL_RE.test(email)) throw new Error('Enter a valid email address.');
    if (!taxId || !/^\d{5,20}$/.test(taxId)) throw new Error('Enter a valid document number.');

    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new Error('An account with this email already exists.');

    // Per the product flow, identity verification (KYC) is a separate step after
    // sign-up; the legal name comes from that verification, not from a free-text
    // field. The account starts with KYC pending and a provisional display name.
    const passwordHash = await hashPassword(dto.password);
    const now = new Date();
    const seedTier = FreelancerTier.TIER_1_SEED;
    const user = new UserEntity({
      id: this.newId(),
      email,
      legalName: provisionalName(email),
      taxId,
      role: UserRole.FREELANCER,
      kycStatus: KycStatus.PENDING,
      passwordHash,
      tier: seedTier,
      availableLimitCents: TiersPolicy.TIER_CONFIG[seedTier].maxQuotaCents,
      executionScore: 70,
      completedOperationsCount: 0,
      createdAt: now,
      updatedAt: now
    });
    await this.userRepo.save(user);
    return user;
  }
}

export interface LoginDto {
  email: string;
  password: string;
}

export class LoginUseCase {
  userRepo: UserRepositoryPort;

  constructor(userRepo: UserRepositoryPort) {
    this.userRepo = userRepo;
  }

  async execute(dto: LoginDto): Promise<UserEntity> {
    const email = dto.email?.trim().toLowerCase();
    if (!email || typeof dto.password !== 'string') throw new Error('Invalid credentials.');
    const user = await this.userRepo.findByEmail(email);
    // Verify a hash even when the user is missing, to keep timing uniform.
    const stored = user?.passwordHash ?? 'scrypt$16384$00$00';
    const ok = await verifyPassword(dto.password, stored);
    if (!user || !ok) throw new Error('Invalid credentials.');
    return user;
  }
}

export interface VerifyIdentityDto {
  userId: string;
  legalName: string;
}

/**
 * KYC verification: the step after sign-up. Runs the configured KYC provider
 * (today a deterministic adapter; a real provider like Truora is a drop-in),
 * and on success sets the verified legal name and KYC status on the account.
 */
export class VerifyIdentityUseCase {
  userRepo: UserRepositoryPort;
  kyc: KycPort;

  constructor(userRepo: UserRepositoryPort, kyc: KycPort) {
    this.userRepo = userRepo;
    this.kyc = kyc;
  }

  async execute(dto: VerifyIdentityDto): Promise<UserEntity> {
    const legalName = dto.legalName?.trim();
    if (!legalName || legalName.length < 3 || legalName.length > 80) throw new Error('Enter your full legal name (3-80 characters).');
    const user = await this.userRepo.findById(dto.userId);
    if (!user) throw new Error('User not found.');
    const result = await this.kyc.verifyIdentity({ taxId: user.taxId, legalName });
    if (!result.verified) {
      user.kycStatus = KycStatus.REJECTED;
      user.updatedAt = new Date();
      await this.userRepo.save(user);
      throw new Error('Identity verification could not be completed.');
    }
    user.legalName = legalName;
    user.kycStatus = KycStatus.VERIFIED;
    user.updatedAt = new Date();
    await this.userRepo.save(user);
    return user;
  }
}

export interface ChangePasswordDto {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export class ChangePasswordUseCase {
  userRepo: UserRepositoryPort;

  constructor(userRepo: UserRepositoryPort) {
    this.userRepo = userRepo;
  }

  async execute(dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findById(dto.userId);
    if (!user || !user.passwordHash) throw new Error('User not found.');
    const ok = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!ok) throw new Error('Current password is incorrect.');
    user.passwordHash = await hashPassword(dto.newPassword);
    user.updatedAt = new Date();
    await this.userRepo.save(user);
  }
}
