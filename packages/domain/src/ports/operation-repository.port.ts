/**
 * @proofly/domain - Puerto de Repositorio de Operaciones
 */

import { OperationEntity } from '../models/operation.ts';
import { OperationState } from '../state/operation-state.ts';

export interface OperationMarketplaceFilter {
  minTermDays?: number;
  maxTermDays?: number;
}

export interface PresentationMetadata {
  title: string;
  effectiveAnnualRate: number;
  // Contract grouping for milestones; omitted for invoices.
  contractId?: string;
  milestoneIndex?: number;
}

export interface OperationRepositoryPort {
  save(operation: OperationEntity): Promise<void>;
  findById(id: string): Promise<OperationEntity | null>;
  findByHmac(hmacKey: string): Promise<OperationEntity | null>;
  findByConfirmationToken(token: string): Promise<OperationEntity | null>;
  listMarketplace(filter?: OperationMarketplaceFilter): Promise<OperationEntity[]>;
  listByFreelancer(freelancerId: string): Promise<OperationEntity[]>;
  updateStatus(id: string, newStatus: OperationState): Promise<void>;
  // Persist presentation metadata (title, quoted E.A., contract grouping) for an
  // operation so it survives a restart. Kept separate from save() because the
  // domain use cases create operations without this UI-facing metadata.
  setPresentation(id: string, meta: PresentationMetadata): Promise<void>;
}
