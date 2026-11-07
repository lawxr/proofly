/**
 * @proofly/worker - Daily Reconciliation Job (Cron 23:59 UTC)
 * Auditoría de 3 vías: Base de Datos vs Contratos ERC-1155 Base L2 vs Extracto Bancario
 * Invariante de Discrepancia Cero ($0 COP)
 */

import { OperationEntity, OperationStatus } from '@proofly/domain';
import type { OperationRepositoryPort } from '@proofly/domain';

export interface OnChainOperationSnapshot {
  tokenId: bigint;
  nominalAmountCents: bigint;
  settledAmountCents: bigint;
  isSettled: boolean;
}

export interface BankStatementRecord {
  transactionRef: string;
  operationId: string;
  amountCents: bigint;
  timestamp: Date;
}

export interface ChainDataProvider {
  getOperationSnapshot(operationHmac: string): Promise<OnChainOperationSnapshot | null>;
}

export interface BankDataProvider {
  getSettlementReceipts(): Promise<BankStatementRecord[]>;
}

export interface ReconciliationReport {
  reportId: string;
  timestamp: Date;
  balanced: boolean;
  auditedOperationsCount: number;
  totalDbSettledCents: bigint;
  totalOnChainSettledCents: bigint;
  totalBankReceivedCents: bigint;
  discrepancyCents: bigint;
  discrepancyDetails: string[];
}

export class DailyReconciliationJob {
  private operationRepo: OperationRepositoryPort;
  private chainProvider: ChainDataProvider;
  private bankProvider: BankDataProvider;

  constructor(
    operationRepo: OperationRepositoryPort,
    chainProvider: ChainDataProvider,
    bankProvider: BankDataProvider
  ) {
    this.operationRepo = operationRepo;
    this.chainProvider = chainProvider;
    this.bankProvider = bankProvider;
  }

  async runDailyAudit(allOperations: OperationEntity[]): Promise<ReconciliationReport> {
    const reportId = `AUDIT-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
    const timestamp = new Date();

    let totalDbSettledCents = 0n;
    let totalOnChainSettledCents = 0n;
    let totalBankReceivedCents = 0n;
    const discrepancyDetails: string[] = [];

    const bankRecords = await this.bankProvider.getSettlementReceipts();
    const bankMap = new Map<string, bigint>();
    for (const b of bankRecords) {
      const current = bankMap.get(b.operationId) ?? 0n;
      bankMap.set(b.operationId, current + b.amountCents);
      totalBankReceivedCents += b.amountCents;
    }

    let auditedCount = 0;
    for (const op of allOperations) {
      if (
        op.status === OperationStatus.SETTLED ||
        op.status === OperationStatus.PARTIALLY_SETTLED_OVERDUE ||
        op.status === OperationStatus.DISBURSED
      ) {
        auditedCount++;
        const dbSettled = op.status === OperationStatus.SETTLED ? op.nominalAmountCents : 0n;
        totalDbSettledCents += dbSettled;

        // 1. Verificar contra estado On-Chain
        const chainSnapshot = await this.chainProvider.getOperationSnapshot(op.hmacKey);
        if (!chainSnapshot) {
          discrepancyDetails.push(`Op ${op.id}: Not found on-chain with HMAC ${op.hmacKey}`);
          continue;
        }

        totalOnChainSettledCents += chainSnapshot.settledAmountCents;

        if (dbSettled !== chainSnapshot.settledAmountCents) {
          discrepancyDetails.push(
            `Op ${op.id}: Mismatch DB (${dbSettled}) vs Chain (${chainSnapshot.settledAmountCents})`
          );
        }

        // 2. Verificar contra comprobantes bancarios
        const bankAmount = bankMap.get(op.id) ?? 0n;
        if (op.status === OperationStatus.SETTLED && bankAmount !== dbSettled) {
          discrepancyDetails.push(
            `Op ${op.id}: Mismatch DB Settled (${dbSettled}) vs Bank Receipt (${bankAmount})`
          );
        }
      }
    }

    const diffDbChain = totalDbSettledCents > totalOnChainSettledCents
      ? totalDbSettledCents - totalOnChainSettledCents
      : totalOnChainSettledCents - totalDbSettledCents;

    const diffDbBank = totalDbSettledCents > totalBankReceivedCents
      ? totalDbSettledCents - totalBankReceivedCents
      : totalBankReceivedCents - totalDbSettledCents;

    const discrepancyCents = diffDbChain + diffDbBank;
    const balanced = discrepancyCents === 0n && discrepancyDetails.length === 0;

    return {
      reportId,
      timestamp,
      balanced,
      auditedOperationsCount: auditedCount,
      totalDbSettledCents,
      totalOnChainSettledCents,
      totalBankReceivedCents,
      discrepancyCents,
      discrepancyDetails
    };
  }
}
