/**
 * @proofly/domain - Use Case: Registrar un retiro (claim) mUSDC confirmado on-chain
 *
 * El retiro lo firma el financiador en su wallet; aquí solo se verifica el
 * receipt (evento CapitalClaimed) y se deja la prueba en el outbox. Reenviar la
 * misma transacción no duplica el registro.
 */

import { InvestmentEntity, InvestmentStatus } from '../models/investment.ts';
import { OperationStatus } from '../state/operation-state.ts';
import type { VaultLedgerPort, VaultClaimProof } from '../ports/vault-ledger.port.ts';
import type { OperationRepositoryPort } from '../ports/operation-repository.port.ts';
import type { InvestmentRepositoryPort } from '../ports/investment-repository.port.ts';
import type { UserRepositoryPort } from '../ports/user-repository.port.ts';
import type { OutboxRepositoryPort } from '../ports/outbox-repository.port.ts';

export interface RecordVaultClaimDto {
  operationId: string;
  investorId: string;
  txHash: string;
}

export interface RecordVaultClaimResult {
  investment: InvestmentEntity;
  proof: VaultClaimProof;
  isNew: boolean;
}

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

export class RecordVaultClaimUseCase {
  operationRepo: OperationRepositoryPort;
  investmentRepo: InvestmentRepositoryPort;
  userRepo: UserRepositoryPort;
  outboxRepo: OutboxRepositoryPort;
  ledger: VaultLedgerPort;

  constructor(
    operationRepo: OperationRepositoryPort,
    investmentRepo: InvestmentRepositoryPort,
    userRepo: UserRepositoryPort,
    outboxRepo: OutboxRepositoryPort,
    ledger: VaultLedgerPort
  ) {
    this.operationRepo = operationRepo;
    this.investmentRepo = investmentRepo;
    this.userRepo = userRepo;
    this.outboxRepo = outboxRepo;
    this.ledger = ledger;
  }

  async execute(dto: RecordVaultClaimDto): Promise<RecordVaultClaimResult> {
    if (!TX_HASH.test(dto.txHash)) throw new Error('A valid claim transaction hash is required.');
    const investor = await this.userRepo.findById(dto.investorId);
    if (!investor) throw new Error(`Investor with id ${dto.investorId} not found`);
    if (!investor.isKycVerified()) throw new Error('Investor must be KYC verified to withdraw.');
    if (!investor.walletAddress) throw new Error('Connect and verify your wallet before withdrawing.');

    const operation = await this.operationRepo.findById(dto.operationId);
    if (!operation) throw new Error(`Operation ${dto.operationId} not found`);
    if (operation.status !== OperationStatus.SETTLED) throw new Error('The operation is not settled yet.');

    const investment = (await this.investmentRepo.findByInvestorId(investor.id)).find(inv => inv.operationId === operation.id);
    if (!investment) throw new Error('You have no participation in this operation.');

    const proof = await this.ledger.verifyClaim({ txHash: dto.txHash, operationId: operation.id, wallet: investor.walletAddress });

    const previous = this.outboxRepo.listByAggregate
      ? await this.outboxRepo.listByAggregate('INVESTMENT', investment.id)
      : [];
    const already = previous.some(ev => ev.eventType === 'INVESTMENT_CLAIMED'
      && String(ev.payload.txHash).toLowerCase() === proof.txHash.toLowerCase());
    if (already) return { investment, proof, isNew: false };

    investment.status = InvestmentStatus.SETTLED;
    await this.investmentRepo.save(investment);
    await this.outboxRepo.recordEvent({
      aggregateType: 'INVESTMENT',
      aggregateId: investment.id,
      eventType: 'INVESTMENT_CLAIMED',
      payload: {
        investmentId: investment.id,
        operationId: operation.id,
        investorId: investor.id,
        financierAddress: investor.walletAddress,
        tokenId: proof.tokenId.toString(),
        txHash: proof.txHash,
        blockNumber: proof.blockNumber.toString(),
        amountUsdcUnits: proof.amountUsdcUnits.toString()
      }
    });
    return { investment, proof, isNew: true };
  }
}
