/**
 * @proofly/domain - Puerto de Repositorio de Inversiones / Participaciones
 */

import { InvestmentEntity } from '../models/investment.ts';

export interface InvestmentRepositoryPort {
  save(investment: InvestmentEntity): Promise<void>;
  findById(id: string): Promise<InvestmentEntity | null>;
  findByOperationId(operationId: string): Promise<InvestmentEntity[]>;
  findByInvestorId(investorId: string): Promise<InvestmentEntity[]>;
  sumFundedByOperationId(operationId: string): Promise<bigint>;
}
