/**
 * @proofly/domain - Puerto de Repositorio de Usuarios
 */

import { UserEntity } from '../models/user.ts';
import { FreelancerTier } from '../reputation/tiers-policy.ts';

export interface UserRepositoryPort {
  save(user: UserEntity): Promise<void>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  updateTier(userId: string, tier: FreelancerTier, newLimitCents: bigint): Promise<void>;
  decrementLimit(userId: string, amountCents: bigint): Promise<void>;
  incrementLimit(userId: string, amountCents: bigint): Promise<void>;
}
