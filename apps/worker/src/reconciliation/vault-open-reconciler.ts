/**
 * @proofly/worker - Conciliador de apertura del vault mUSDC
 *
 * Eventos OPERATION_LISTED_ON_MARKETPLACE históricos pudieron quedar COMPLETED
 * antes de que existiera el vault. Este paso recorre las operaciones aprobadas
 * en PostgreSQL y abre on-chain las que aún no tienen tokenId. Es idempotente
 * (el contrato bloquea el HMAC) y reporta, sin escribir, las inconsistencias.
 */

import type { OperationRepositoryPort, VaultLedgerPort } from '@proofly/domain';
import type { OutboxDispatcher } from '../outbox/dispatcher.ts';

export class VaultOpenReconciler {
  private readonly reported = new Set<string>();
  private readonly operationRepo: OperationRepositoryPort;
  private readonly ledger: VaultLedgerPort;
  private readonly dispatcher: OutboxDispatcher;
  private readonly log: (message: string) => void;

  constructor(
    operationRepo: OperationRepositoryPort,
    ledger: VaultLedgerPort,
    dispatcher: OutboxDispatcher,
    log: (message: string) => void = message => console.log(message)
  ) {
    this.operationRepo = operationRepo;
    this.ledger = ledger;
    this.dispatcher = dispatcher;
    this.log = log;
  }

  async run(): Promise<{ opened: number; inconsistent: number }> {
    let opened = 0;
    let inconsistent = 0;
    const approved = await this.operationRepo.listMarketplace();
    for (const operation of approved) {
      if (operation.status !== 'APPROVED_PENDING_FUNDING') continue;
      try {
        const vault = await this.ledger.getOperation(operation.id);
        if (vault) {
          if (vault.targetCents !== operation.advanceAmountCents) {
            inconsistent++;
            if (!this.reported.has(operation.id)) {
              this.reported.add(operation.id);
              this.log(`[Vault Reconciler] INCONSISTENCIA ${operation.id}: token ${vault.tokenId} meta on-chain ${vault.targetCents} ≠ adelanto ${operation.advanceAmountCents}. Depósitos y liquidación bloqueados.`);
            }
          }
          continue;
        }
        await this.dispatcher.openVaultOperation(operation.id, operation.advanceAmountCents.toString());
        opened++;
      } catch (error) {
        // Atraso del RPC: se reintenta en el siguiente ciclo sin reportarlo.
        if (error instanceof Error && /RPC lag/.test(error.message)) continue;
        if (!this.reported.has(operation.id)) {
          this.reported.add(operation.id);
          this.log(`[Vault Reconciler] No se pudo abrir ${operation.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    return { opened, inconsistent };
  }
}
