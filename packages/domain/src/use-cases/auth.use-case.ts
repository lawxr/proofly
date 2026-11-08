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
  legalName: string;
  taxId: string;
  password: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class RegisterUserUseCase {
  userRepo: UserRepositoryPort;
  kyc?: KycPort;
  newId: () => string;

  constructor(userRepo: UserRepositoryPort, kyc?: KycPort, newId: () => string = () => crypto.randomUUID()) {
    this.userRepo = userRepo;
    this.kyc = kyc;
    this.newId = newId;
  }

  async execute(dto: RegisterUserDto): Promise<UserEntity> {
    const email = dto.email?.trim().toLowerCase();
    const legalName = dto.legalName?.trim();
    const taxId = dto.taxId?.trim();
    if (!email || !EMAIL_RE.test(email)) throw new Error('Enter a valid email address.');
    if (!legalName || legalName.length < 3 || legalName.length > 80) throw new Error('Enter your full name (3-80 characters).');
    if (!taxId || !/^\d{5,20}$/.test(taxId)) throw new Error('Enter a valid document number.');

    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new Error('An account with this email already exists.');

    // Identity verification runs through the configured KYC provider. Today that
    // provider is a deterministic adapter; swapping it for a real one (Truora)
    // is an adapter change, not a change here.
    let kycStatus = KycStatus.PENDING;
    if (this.kyc) {
      const result = await this.kyc.verifyIdentity({ taxId, legalName });
      kycStatus = result.verified ? KycStatus.VERIFIED : KycStatus.REJECTED;
    }

    const passwordHash = await hashPassword(dto.password);
    const now = new Date();
    const seedTier = FreelancerTier.TIER_1_SEED;
    const user = new UserEntity({
      id: this.newId(),
      email,
      legalName,
      taxId,
      role: UserRole.FREELANCER,
      kycStatus,
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

export interface UpdateProfileDto {
  userId: string;
  legalName: string;
}

export class UpdateProfileUseCase {
  userRepo: UserRepositoryPort;

  constructor(userRepo: UserRepositoryPort) {
    this.userRepo = userRepo;
  }

  async execute(dto: UpdateProfileDto): Promise<UserEntity> {
    const legalName = dto.legalName?.trim();
    if (!legalName || legalName.length < 3 || legalName.length > 80) throw new Error('Enter your full name (3-80 characters).');
    const user = await this.userRepo.findById(dto.userId);
    if (!user) throw new Error('User not found.');
    user.legalName = legalName;
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
