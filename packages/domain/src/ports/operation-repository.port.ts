/**
 * @proofly/domain - Puerto de Repositorio de Operaciones
 */

import { OperationEntity } from '../models/operation.ts';
import { OperationState } from '../state/operation-state.ts';

export interface OperationMarketplaceFilter {
  minTermDays?: number;
  maxTermDays?: number;
}

export interface OperationRepositoryPort {
  save(operation: OperationEntity): Promise<void>;
  findById(id: string): Promise<OperationEntity | null>;
  findByHmac(hmacKey: string): Promise<OperationEntity | null>;
  findByConfirmationToken(token: string): Promise<OperationEntity | null>;
  listMarketplace(filter?: OperationMarketplaceFilter): Promise<OperationEntity[]>;
  updateStatus(id: string, newStatus: OperationState): Promise<void>;
}
