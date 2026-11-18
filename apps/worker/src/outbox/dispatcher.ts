/**
 * @proofly/worker - Outbox Dispatcher
 * Procesa eventos transaccionales de la base de datos y los despacha a la red EVM.
 *
 * Reglas de seguridad:
 *  - Reintentos con retroceso exponencial solo para errores transitorios (RPC, red).
 *  - Un revert del contrato o una inconsistencia PostgreSQL/contrato es permanente:
 *    el evento queda FAILED con el motivo y no se reintenta una acción financiera.
 *  - Un evento solo se marca COMPLETED cuando el receipt fue exitoso y el estado
 *    on-chain esperado (p. ej. hmacToTokenId != 0, estado Settled) se verificó.
 *  - El worker nunca retira fondos de los financiadores.
 */

import { OutboxEvent, UsdcDemoRate } from '@proofly/domain';
import type { OutboxRepositoryPort, BlockchainPort, PaymentRailPort, VaultLedgerPort, OperationRepositoryPort } from '@proofly/domain';

export interface DispatcherConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  batchSize?: number;
  now?: () => number;
  /** Fondeo con vault mUSDC. Por defecto: BLOCKCHAIN_ADAPTER=viem y MOCK_USDC_ADDRESS. */
  vaultMode?: boolean;
  /** Lector on-chain para verificar estado antes de acciones financieras. */
  ledger?: VaultLedgerPort;
  /** Repositorio de operaciones para contrastar el payload con PostgreSQL. */
  operationRepo?: OperationRepositoryPort;
  copPerUsdc?: bigint | number;
  log?: (message: string) => void;
}

/** Error de despacho; `permanent` evita reintentos de acciones financieras. */
export class DispatchError extends Error {
  readonly permanent: boolean;
  constructor(message: string, permanent: boolean) {
    super(message);
    this.name = 'DispatchError';
    this.permanent = permanent;
  }
}

const permanent = (message: string) => new DispatchError(message, true);

export class OutboxDispatcher {
  outboxRepo: OutboxRepositoryPort;
  blockchain: BlockchainPort;
  paymentRail: PaymentRailPort;
  config: Required<Omit<DispatcherConfig, 'now' | 'ledger' | 'operationRepo' | 'vaultMode' | 'copPerUsdc' | 'log'>>;
  now: () => number;
  vaultMode: boolean;
  ledger?: VaultLedgerPort;
  operationRepo?: OperationRepositoryPort;
  rate: UsdcDemoRate;
  log: (message: string) => void;
  // When an event may next be retried, by event id (exponential backoff).
  private nextRetryAt: Map<string, number>;

  constructor(
    outboxRepo: OutboxRepositoryPort,
    blockchain: BlockchainPort,
    paymentRail: PaymentRailPort,
    config?: DispatcherConfig
  ) {
    this.outboxRepo = outboxRepo;
    this.blockchain = blockchain;
    this.paymentRail = paymentRail;
    this.now = config?.now ?? Date.now;
    this.nextRetryAt = new Map();
    this.config = {
      maxRetries: config?.maxRetries ?? 5,
      baseDelayMs: config?.baseDelayMs ?? 1000,
      maxDelayMs: config?.maxDelayMs ?? 60000,
      batchSize: config?.batchSize ?? 10
    };
    this.vaultMode = config?.vaultMode
      ?? Boolean(process.env.BLOCKCHAIN_ADAPTER === 'viem' && process.env.MOCK_USDC_ADDRESS);
    this.ledger = config?.ledger;
    this.operationRepo = config?.operationRepo;
    this.rate = new UsdcDemoRate(BigInt(config?.copPerUsdc ?? (process.env.DEMO_COP_PER_USDC || 4000)));
    this.log = config?.log ?? (message => console.log(message));
  }

  /** Exponential backoff: baseDelay * 2^retryCount, capped at maxDelayMs. */
  private delayForRetry(retryCount: number): number {
    const delay = this.config.baseDelayMs * 2 ** Math.max(0, retryCount);
    return Math.min(delay, this.config.maxDelayMs);
  }

  async processBatch(): Promise<{ processedCount: number; failedCount: number; skippedCount: number }> {
    const events = await this.outboxRepo.fetchPendingEvents(this.config.batchSize);
    const now = this.now();
    let processedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const event of events) {
      // Respect backoff: a failed event waits before it is retried.
      const waitUntil = this.nextRetryAt.get(event.id);
      if (waitUntil !== undefined && waitUntil > now) { skippedCount++; continue; }

      // Stop retrying once the event has exhausted its retry budget.
      if (event.retryCount >= this.config.maxRetries) { skippedCount++; continue; }

      try {
        await this.dispatchEvent(event);
        await this.outboxRepo.markCompleted(event.id);
        this.nextRetryAt.delete(event.id);
        processedCount++;
      } catch (err: unknown) {
        failedCount++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isPermanent = err instanceof DispatchError && err.permanent;
        const exhausted = event.retryCount + 1 >= this.config.maxRetries;
        if (!isPermanent && !exhausted && this.outboxRepo.markRetry) {
          await this.outboxRepo.markRetry(event.id, errorMessage);
          this.log(`[Worker] ${event.eventType} ${event.id} · error transitorio, reintento ${event.retryCount + 1}/${this.config.maxRetries}: ${errorMessage}`);
        } else {
          await this.outboxRepo.markFailed(event.id, errorMessage);
          this.log(`[Worker] ${event.eventType} ${event.id} · FAILED${isPermanent ? ' (permanente)' : ''}: ${errorMessage}`);
        }
        // Schedule the next attempt after an exponential delay.
        this.nextRetryAt.set(event.id, this.now() + this.delayForRetry(event.retryCount));
      }
    }

    return { processedCount, failedCount, skippedCount };
  }

  private requireVault(): { ledger: VaultLedgerPort; blockchain: Required<Pick<BlockchainPort, 'openOperationTokens' | 'fundAndSettleOperation'>> } {
    if (!this.ledger || !this.blockchain.openOperationTokens || !this.blockchain.fundAndSettleOperation) {
      throw permanent('Vault mode requires a vault ledger and a blockchain adapter with openOperationTokens/fundAndSettleOperation.');
    }
    return {
      ledger: this.ledger,
      blockchain: {
        openOperationTokens: this.blockchain.openOperationTokens.bind(this.blockchain),
        fundAndSettleOperation: this.blockchain.fundAndSettleOperation.bind(this.blockchain)
      }
    };
  }

  private async dispatchEvent(event: OutboxEvent): Promise<void> {
    switch (event.eventType) {
      case 'OPERATION_LISTED_ON_MARKETPLACE': {
        if (!this.vaultMode) break;
        const payload = event.payload as { operationId: string; advanceAmountCents?: string };
        await this.openVaultOperation(payload.operationId, payload.advanceAmountCents);
        break;
      }

      case 'OPERATION_FULLY_FUNDED': {
        const payload = event.payload as {
          operationId: string;
          freelancerId: string;
          financierAddress?: string;
          totalFundedCents: string;
          advanceAmountCents: string;
          hmacKey: string;
        };

        if (this.vaultMode) {
          // El fondeo ya ocurrió on-chain (depósitos mUSDC). Antes de "desembolsar"
          // se exige que el vault esté Funded con la meta exacta.
          const { ledger } = this.requireVault();
          const vault = await ledger.getOperation(payload.operationId);
          if (!vault) throw permanent(`No disbursement: operation ${payload.operationId} is not open on-chain.`);
          if (!['Funded', 'Settled'].includes(vault.state) || vault.fundedCents !== BigInt(payload.advanceAmountCents)) {
            throw permanent(`No disbursement: token ${vault.tokenId} is ${vault.state} with ${vault.fundedCents}/${payload.advanceAmountCents} cents funded.`);
          }
          this.log(`[Worker Chain] Fondeo verificado on-chain · token ${vault.tokenId} · ${vault.fundedUsdcUnits} unidades mUSDC`);
        } else {
          const financierAddress = payload.financierAddress || process.env.PROOFLY_FINANCIER_ADDRESS;
          if (!financierAddress && process.env.BLOCKCHAIN_ADAPTER === 'viem') {
            throw permanent('No wallet is linked to the financier and PROOFLY_FINANCIER_ADDRESS is not configured.');
          }
          const mintResult = await this.blockchain.mintOperationTokens({
            operationId: payload.operationId,
            toAddress: financierAddress || '0x0000000000000000000000000000000000000001',
            amountTokens: BigInt(payload.totalFundedCents)
          });
          if (!mintResult.success) throw new Error(`Failed to mint tokens on Base: ${mintResult.txHash}`);
          this.log(`[Worker Chain] ERC-1155 minteado para ${financierAddress || 'financiador configurado'} · tx ${mintResult.txHash}`);
        }

        // Desembolso del adelanto neto en COP al Freelancer por riel bancario ACH
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
          investorPayoutCents?: string;
        };

        if (this.vaultMode) {
          await this.settleVaultOperation(event.eventType, payload);
          break;
        }
        const burnResult = await this.blockchain.burnOperationTokens({
          operationId: payload.operationId,
          receiptHash: payload.bankReceiptHash
        });
        if (!burnResult.success) throw new Error(`Failed to record settlement on Base: ${burnResult.txHash}`);
        this.log(`[Worker Chain] Liquidación registrada · tx ${burnResult.txHash}`);
        break;
      }

      case 'WALLET_ONBOARDING_REQUESTED': {
        // Demo onboarding: on-chain KYC + demo mUSDC + gas. Never moves user funds.
        if (!this.vaultMode) break;
        if (!this.blockchain.onboardDemoWallet) throw permanent('The blockchain adapter cannot onboard wallets.');
        const payload = event.payload as { userId: string; walletAddress: string };
        const result = await this.blockchain.onboardDemoWallet({
          walletAddress: payload.walletAddress,
          minUsdcUnits: 100n * 1_000_000n,
          mintUsdcUnits: BigInt(process.env.DEMO_ONBOARD_MUSDC || 1000) * 1_000_000n,
          minEthWei: 5_000_000_000_000_000n,
          topUpEthWei: BigInt(process.env.DEMO_ONBOARD_ETH_WEI || '10000000000000000')
        });
        if (!result.success) {
          throw new DispatchError(`Wallet onboarding failed for ${payload.walletAddress}: ${result.detail}`, Boolean(result.permanent));
        }
        this.log(result.actions.length
          ? `[Worker Chain] Wallet ${payload.walletAddress} habilitada (${result.actions.join(', ')}) · tx ${result.txHashes.join(', ') || '-'}`
          : `[Worker Chain] Wallet ${payload.walletAddress} ya estaba habilitada`);
        break;
      }

      case 'INVESTMENT_DEPOSIT_CONFIRMED':
      case 'INVESTMENT_CLAIMED': {
        // La API ya verificó el receipt; el worker lo vuelve a comprobar con su RPC
        // para que una prueba inválida quede marcada como FAILED.
        if (!this.vaultMode) break;
        const { ledger } = this.requireVault();
        const payload = event.payload as { operationId: string; financierAddress: string; txHash: string };
        const verify = event.eventType === 'INVESTMENT_CLAIMED' ? ledger.verifyClaim.bind(ledger) : ledger.verifyDeposit.bind(ledger);
        try {
          const proof = await verify({ txHash: payload.txHash, operationId: payload.operationId, wallet: payload.financierAddress });
          this.log(`[Worker Chain] ${event.eventType === 'INVESTMENT_CLAIMED' ? 'Retiro' : 'Depósito'} verificado · token ${proof.tokenId} · ${proof.amountUsdcUnits} unidades mUSDC · tx ${proof.txHash}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (/not found on the configured network/i.test(message)) throw new Error(message);
          throw permanent(`Invalid on-chain proof ${payload.txHash}: ${message}`);
        }
        break;
      }

      default:
        // Otros eventos informativos de outbox
        break;
    }
  }

  /**
   * Abre la operación en el vault con la meta = adelanto. Contrasta con
   * PostgreSQL cuando hay repositorio y nunca marca completado sin tokenId.
   */
  async openVaultOperation(operationId: string, advanceFromPayload?: string): Promise<bigint> {
    const { blockchain } = this.requireVault();
    let target = advanceFromPayload ? BigInt(advanceFromPayload) : undefined;
    if (this.operationRepo) {
      const operation = await this.operationRepo.findById(operationId);
      if (!operation) throw permanent(`Operation ${operationId} not found in PostgreSQL.`);
      if (target !== undefined && target !== operation.advanceAmountCents) {
        throw permanent(`Event advance ${target} differs from PostgreSQL advance ${operation.advanceAmountCents}.`);
      }
      target = operation.advanceAmountCents;
      if (!this.rate.isCentsRepresentable(operation.commercialDiscountCents)) {
        throw permanent(`Discount ${operation.commercialDiscountCents} cents has no exact mUSDC equivalent; the operation could not be settled.`);
      }
    }
    if (target === undefined) throw permanent(`Event for ${operationId} has no advanceAmountCents.`);
    if (!this.rate.isCentsRepresentable(target)) {
      throw permanent(`Advance ${target} cents has no exact mUSDC equivalent at the demo rate.`);
    }

    const result = await blockchain.openOperationTokens({ operationId, fundingTargetCents: target });
    if (!result.success || !result.tokenId) {
      throw new DispatchError(`Failed to open mUSDC vault operation ${operationId}: ${result.txHash}`, Boolean(result.permanent));
    }
    this.log(result.alreadyOpen
      ? `[Worker Chain] Operación ${operationId} ya abierta on-chain · token ${result.tokenId}`
      : `[Worker Chain] Operación ${operationId} abierta para depósito mUSDC · token ${result.tokenId} · meta ${target} centavos · tx ${result.txHash}`);
    return result.tokenId;
  }

  private async settleVaultOperation(eventType: string, payload: { operationId: string; bankReceiptHash: string; investorPayoutCents?: string; isFullySettled: boolean }) {
    const { ledger, blockchain } = this.requireVault();
    if (eventType === 'OPERATION_PARTIALLY_SETTLED' || !payload.isFullySettled) {
      throw permanent('Partial settlement is not supported by the mUSDC vault MVP; no on-chain action taken.');
    }
    if (!payload.investorPayoutCents) {
      throw permanent('Settlement event has no investorPayoutCents (legacy event); refusing to settle on-chain.');
    }
    const payoutCents = BigInt(payload.investorPayoutCents);
    if (!this.rate.isCentsRepresentable(payoutCents)) {
      throw permanent(`Investor payout ${payoutCents} cents has no exact mUSDC equivalent at the demo rate.`);
    }

    const vault = await ledger.getOperation(payload.operationId);
    if (!vault) throw permanent(`Operation ${payload.operationId} is not open on-chain.`);
    if (this.operationRepo) {
      const operation = await this.operationRepo.findById(payload.operationId);
      if (!operation) throw permanent(`Operation ${payload.operationId} not found in PostgreSQL.`);
      if (operation.fundedCapitalCents !== vault.fundedCents || vault.targetCents !== operation.advanceAmountCents) {
        throw permanent(`PostgreSQL funded ${operation.fundedCapitalCents}/${operation.advanceAmountCents} differs from on-chain ${vault.fundedCents}/${vault.targetCents}.`);
      }
    }

    const receivedUsdc = this.rate.centsToUnits(payoutCents);
    const result = await blockchain.fundAndSettleOperation({
      operationId: payload.operationId,
      receiptHash: payload.bankReceiptHash,
      receivedUsdc
    });
    if (!result.success) {
      throw new DispatchError(`Failed to record mUSDC vault settlement: ${result.txHash}`, Boolean(result.permanent));
    }
    this.log(result.alreadySettled
      ? `[Worker Chain] Token ${result.tokenId} ya liquidado on-chain con este recaudo`
      : `[Worker Chain] Liquidación registrada · token ${result.tokenId} · ${receivedUsdc} unidades mUSDC para financiadores · tx ${result.txHash}`);
  }
}
