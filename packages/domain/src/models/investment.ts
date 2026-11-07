/**
 * @proofly/domain - Entidad de Inversión / Participación
 */

export const InvestmentStatus = {
  CONFIRMED: 'CONFIRMED',
  SETTLED: 'SETTLED',
  CANCELLED: 'CANCELLED',
} as const;

export type InvestmentStatus = typeof InvestmentStatus[keyof typeof InvestmentStatus];

export interface InvestmentProps {
  id: string;
  operationId: string;
  investorId: string;
  fundedCapitalCents: bigint;
  tokensCount: bigint;
  status: InvestmentStatus;
  createdAt: Date;
}

export class InvestmentEntity {
  id: string;
  operationId: string;
  investorId: string;
  fundedCapitalCents: bigint;
  tokensCount: bigint;
  status: InvestmentStatus;
  createdAt: Date;

  constructor(props: InvestmentProps) {
    this.id = props.id;
    this.operationId = props.operationId;
    this.investorId = props.investorId;
    this.fundedCapitalCents = props.fundedCapitalCents;
    this.tokensCount = props.tokensCount;
    this.status = props.status;
    this.createdAt = props.createdAt;
  }
}
