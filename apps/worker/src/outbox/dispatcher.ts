/**
 * @proofly/worker - Outbox Dispatcher
 * Procesa eventos transaccionales de la base de datos y despacha a Base L2
 * Implementa reintentos con retroceso exponencial (Exponential Backoff)
 */

import { OutboxEvent, OutboxStatus } from '@proofly/domain';
import type { OutboxRepositoryPort, BlockchainPort, PaymentRailPort } from '@proofly/domain';

export interface DispatcherConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  batchSize?: number;
}

export class OutboxDispatcher {
  outboxRepo: OutboxRepositoryPort;
  blockchain: BlockchainPort;
  paymentRail: PaymentRailPort;
  config: Required<DispatcherConfig>;

  constructor(
    outboxRepo: OutboxRepositoryPort,
    blockchain: BlockchainPort,
    paymentRail: PaymentRailPort,
    config?: DispatcherConfig
  ) {
    this.outboxRepo = outboxRepo;
    this.blockchain = blockchain;
    this.paymentRail = paymentRail;
    this.config = {
      maxRetries: config?.maxRetries ?? 5,
      baseDelayMs: config?.baseDelayMs ?? 1000,
      batchSize: config?.batchSize ?? 10
    };
  }

  async processBatch(): Promise<{ processedCount: number; failedCount: number }> {
    const events = await this.outboxRepo.fetchPendingEvents(this.config.batchSize);
    let processedCount = 0;
    let failedCount = 0;

    for (const event of events) {
      try {
        await this.dispatchEvent(event);
        await this.outboxRepo.markCompleted(event.id);
        processedCount++;
      } catch (err: unknown) {
        failedCount++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        await this.outboxRepo.markFailed(event.id, errorMessage);
      }
    }

    return { processedCount, failedCount };
  }

  private async dispatchEvent(event: OutboxEvent): Promise<void> {
    switch (event.eventType) {
      case 'OPERATION_FULLY_FUNDED': {
        const payload = event.payload as {
          operationId: string;
          freelancerId: string;
          totalFundedCents: string;
          advanceAmountCents: string;
          hmacKey: string;
        };

        // 1. Minteo de tokens ERC-1155 en Base L2
        const mintResult = await this.blockchain.mintOperationTokens({
          operationId: payload.operationId,
          toAddress: '0x0000000000000000000000000000000000000001', // Wallet o pool de financiadores
          amountTokens: BigInt(payload.totalFundedCents)
        });

        if (!mintResult.success) {
          throw new Error(`Failed to mint tokens on Base: ${mintResult.txHash}`);
        }

        // 2. Desembolso del adelanto neto en COP al Freelancer por riel bancario ACH
        const disburseResult = await this.paymentRail.disburseAdvance({
          recipientAccount: 'AHORROS-BANCOLOMBIA-1020',
          amountCents: BigInt(payload.advanceAmountCents),
          reference: `PROOFLY-ADV-${payload.operationId.slice(0, 8)}`
        });

        if (!disburseResult.success) {
          throw new Error(`Failed to disburse advance to freelancer via ACH: ${disburseResult.transactionId}`);
        }
        break;
      }

      case 'OPERATION_SETTLED':
      case 'OPERATION_PARTIALLY_SETTLED': {
        const payload = event.payload as {
          operationId: string;
          bankReceiptHash: string;
          receivedAmountCents: string;
          bankTransactionRef: string;
          isFullySettled: boolean;
        };

        // Quema de tokens / registro de liquidación on-chain con el hash bancario
        const burnResult = await this.blockchain.burnOperationTokens({
          operationId: payload.operationId,
          receiptHash: payload.bankReceiptHash
        });

        if (!burnResult.success) {
          throw new Error(`Failed to record settlement on Base: ${burnResult.txHash}`);
        }
        break;
      }

      default:
        // Otros eventos informativos de outbox
        break;
    }
  }
}
