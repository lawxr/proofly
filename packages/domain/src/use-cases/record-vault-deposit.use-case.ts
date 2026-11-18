/**
 * @proofly/domain - Use Case: Registrar un depósito mUSDC confirmado on-chain
 *
 * Única vía para convertir un depósito en el vault en una participación COP.
 * Reglas:
 *  - El depósito debe existir on-chain (receipt exitoso + evento OperationDeposited
 *    del contrato configurado, para el tokenId de la operación y la wallet vinculada).
 *  - La meta on-chain debe coincidir con el adelanto off-chain; si no, se bloquea.
 *  - El aporte COP registrado es igual a las participaciones ERC-1155 de la wallet,
 *    por lo que reenviar la misma prueba es idempotente y no duplica el aporte.
 */

import { InvestmentEntity } from '../models/investment.ts';
import { OperationEntity } from '../models/operation.ts';
import { OperationStatus } from '../state/operation-state.ts';
import { PurchaseParticipationUseCase } from './purchase-participation.use-case.ts';
import { VaultInconsistencyError } from '../ports/vault-ledger.port.ts';
import type { VaultLedgerPort, VaultDepositProof, VaultOperationSnapshot } from '../ports/vault-ledger.port.ts';
import type { OperationRepositoryPort } from '../ports/operation-repository.port.ts';
import type { InvestmentRepositoryPort } from '../ports/investment-repository.port.ts';
import type { UserRepositoryPort } from '../ports/user-repository.port.ts';
import type { OutboxRepositoryPort } from '../ports/outbox-repository.port.ts';

export interface RecordVaultDepositDto {
  operationId: string;
  investorId: string;
  txHash: string;
}

export interface RecordVaultDepositResult {
  investment: InvestmentEntity;
  operation: OperationEntity;
  proof: VaultDepositProof;
  vault: VaultOperationSnapshot;
  isNew: boolean;
  isFullyFunded: boolean;
}

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

export class RecordVaultDepositUseCase {
  operationRepo: OperationRepositoryPort;
  investmentRepo: InvestmentRepositoryPort;
  userRepo: UserRepositoryPort;
  outboxRepo: OutboxRepositoryPort;
  ledger: VaultLedgerPort;
  private purchase: PurchaseParticipationUseCase;

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
    this.purchase = new PurchaseParticipationUseCase(operationRepo, investmentRepo, userRepo, outboxRepo);
  }

  async execute(dto: RecordVaultDepositDto): Promise<RecordVaultDepositResult> {
    if (!TX_HASH.test(dto.txHash)) throw new Error('A valid deposit transaction hash is required.');

    const investor = await this.userRepo.findById(dto.investorId);
    if (!investor) throw new Error(`Investor with id ${dto.investorId} not found`);
    if (!investor.isKycVerified()) throw new Error('Investor must be KYC verified to deposit (Invariant I6)');
    if (!investor.walletAddress) throw new Error('Connect and verify your wallet before investing.');

    const operation = await this.operationRepo.findById(dto.operationId);
    if (!operation) throw new Error(`Operation ${dto.operationId} not found`);
    if (operation.freelancerId === investor.id) throw new Error('You cannot invest in your own operation.');

    // 1. Receipt + evento OperationDeposited de la wallet vinculada (lanza si no).
    const proof = await this.ledger.verifyDeposit({ txHash: dto.txHash, operationId: operation.id, wallet: investor.walletAddress });

    // 2. Estado on-chain leído en un bloque que ya incluye el depósito.
    const vault = await this.ledger.getOperation(operation.id, proof.blockNumber);
    if (!vault) throw new Error('The operation is not open on-chain yet.');
    if (proof.tokenId !== vault.tokenId) throw new Error('The deposit belongs to a different on-chain operation.');
    if (vault.targetCents !== operation.advanceAmountCents) {
      throw new VaultInconsistencyError(
        `On-chain funding target (${vault.targetCents} cents) differs from the off-chain advance (${operation.advanceAmountCents} cents).`
      );
    }

    // 3. Participación acumulada de la wallet: fuente de verdad on-chain del aporte.
    const shares = await this.ledger.getHolderShares(vault.tokenId, investor.walletAddress, proof.blockNumber);
    if (shares < proof.sharesCents) {
      throw new VaultInconsistencyError('The wallet no longer holds the shares minted by this deposit.');
    }

    const existing = (await this.investmentRepo.findByInvestorId(investor.id)).find(inv => inv.operationId === operation.id);
    if (existing) {
      if (existing.fundedCapitalCents === shares) {
        return { investment: existing, operation, proof, vault, isNew: false, isFullyFunded: operation.isFullyFunded() };
      }
      throw new VaultInconsistencyError(
        `Off-chain participation (${existing.fundedCapitalCents} cents) differs from on-chain shares (${shares} cents).`
      );
    }

    if (operation.status !== OperationStatus.APPROVED_PENDING_FUNDING) {
      throw new VaultInconsistencyError(`On-chain deposit found but the operation is ${operation.status} off-chain.`);
    }
    // El total off-chain nunca puede superar lo depositado on-chain (evita contar
    // dos veces el mismo depósito, p. ej. si dos cuentas comparten wallet).
    if (operation.fundedCapitalCents + shares > vault.fundedCents) {
      throw new VaultInconsistencyError(
        `Recording ${shares} cents would exceed the ${vault.fundedCents} cents deposited on-chain.`
      );
    }

    const result = await this.purchase.execute({ operationId: operation.id, investorId: investor.id, fundedCapitalCents: shares });

    await this.outboxRepo.recordEvent({
      aggregateType: 'INVESTMENT',
      aggregateId: result.investment.id,
      eventType: 'INVESTMENT_DEPOSIT_CONFIRMED',
      payload: {
        investmentId: result.investment.id,
        operationId: operation.id,
        investorId: investor.id,
        financierAddress: investor.walletAddress,
        tokenId: vault.tokenId.toString(),
        chainKey: vault.chainKey,
        txHash: proof.txHash,
        blockNumber: proof.blockNumber.toString(),
        amountUsdcUnits: proof.amountUsdcUnits.toString(),
        sharesCents: shares.toString()
      }
    });

    return {
      investment: result.investment,
      operation: result.operation,
      proof,
      vault,
      isNew: true,
      isFullyFunded: result.isFullyFunded
    };
  }
}
