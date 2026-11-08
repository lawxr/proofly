import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { hashPassword, verifyPassword } from '../security/password.ts';
import { RegisterUserUseCase, LoginUseCase, ChangePasswordUseCase } from './auth.use-case.ts';
import { UserEntity, UserRole, KycStatus } from '../models/user.ts';
import type { UserRepositoryPort } from '../ports/user-repository.port.ts';
import type { FreelancerTier } from '../reputation/tiers-policy.ts';

class MemUserRepo implements UserRepositoryPort {
  users = new Map<string, UserEntity>();
  async save(u: UserEntity) { this.users.set(u.id, u); }
  async findById(id: string) { return this.users.get(id) ?? null; }
  async findByEmail(email: string) { return [...this.users.values()].find(u => u.email === email) ?? null; }
  async updateTier(id: string, tier: FreelancerTier, limit: bigint) { const u = this.users.get(id); if (u) { u.tier = tier; u.availableLimitCents = limit; } }
  async decrementLimit() {}
  async incrementLimit() {}
}

describe('Auth', () => {
  it('scrypt hashing verifies the right password and rejects wrong ones', async () => {
    const hash = await hashPassword('correct horse battery');
    assert.ok(hash.startsWith('scrypt$'));
    assert.equal(await verifyPassword('correct horse battery', hash), true);
    assert.equal(await verifyPassword('wrong password here', hash), false);
  });

  it('short passwords are rejected at hashing time', async () => {
    await assert.rejects(hashPassword('short'), /at least 8/);
  });

  it('register creates a seed-tier user with a hashed password; login verifies it', async () => {
    const repo = new MemUserRepo();
    const register = new RegisterUserUseCase(repo, () => 'user-1');
    // No name field: it comes from KYC later. A provisional name is derived from the email.
    const user = await register.execute({ email: 'Ana.Ruiz@Proofly.CO', taxId: '1098765432', password: 'una-clave-segura' });
    assert.equal(user.email, 'ana.ruiz@proofly.co'); // normalized
    assert.equal(user.legalName, 'Ana Ruiz'); // provisional, from email local-part
    assert.equal(user.role, UserRole.FREELANCER);
    assert.equal(user.kycStatus, KycStatus.PENDING); // KYC is a later step
    assert.ok(user.passwordHash && user.passwordHash.startsWith('scrypt$'));
    assert.ok(user.tier);

    const login = new LoginUseCase(repo);
    const loggedIn = await login.execute({ email: 'ana.ruiz@proofly.co', password: 'una-clave-segura' });
    assert.equal(loggedIn.id, 'user-1');
    await assert.rejects(login.execute({ email: 'ana.ruiz@proofly.co', password: 'mala-clave-xxx' }), /Invalid credentials/);
    await assert.rejects(login.execute({ email: 'noexiste@proofly.co', password: 'una-clave-segura' }), /Invalid credentials/);
  });

  it('duplicate email is rejected', async () => {
    const repo = new MemUserRepo();
    const register = new RegisterUserUseCase(repo);
    await register.execute({ email: 'dup@proofly.co', taxId: '1098765432', password: 'una-clave-segura' });
    await assert.rejects(register.execute({ email: 'dup@proofly.co', taxId: '1098765433', password: 'otra-clave-segura' }), /already exists/);
  });

  it('a missing or invalid document is rejected', async () => {
    const repo = new MemUserRepo();
    const register = new RegisterUserUseCase(repo);
    await assert.rejects(register.execute({ email: 'x@proofly.co', taxId: 'abc', password: 'una-clave-segura' }), /document/);
  });

  it('change password requires the current one and updates the hash', async () => {
    const repo = new MemUserRepo();
    const u = await new RegisterUserUseCase(repo, () => 'u2').execute({ email: 'c@proofly.co', taxId: '1098765432', password: 'clave-actual-xx' });
    const change = new ChangePasswordUseCase(repo);
    await assert.rejects(change.execute({ userId: u.id, currentPassword: 'clave-equivocada', newPassword: 'clave-nueva-xxx' }), /incorrect/);
    await change.execute({ userId: u.id, currentPassword: 'clave-actual-xx', newPassword: 'clave-nueva-xxx' });
    // Old password no longer works; new one does.
    const login = new LoginUseCase(repo);
    await assert.rejects(login.execute({ email: 'c@proofly.co', password: 'clave-actual-xx' }), /Invalid credentials/);
    const ok = await login.execute({ email: 'c@proofly.co', password: 'clave-nueva-xxx' });
    assert.equal(ok.id, 'u2');
  });
});
