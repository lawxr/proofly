/**
 * @proofly/domain - Puerto del libro mayor on-chain del vault mUSDC
 *
 * Lectura y verificación de pruebas on-chain (depósitos, liquidación y retiros)
 * para que el dominio nunca acepte un aporte COP sin un depósito confirmado.
 * Las implementaciones son de solo lectura: no firman transacciones.
 */

export const VaultOperationState = {
  DRAFT: 'Draft',
  PENDING_CONFIRMATION: 'PendingConfirmation',
  PENDING_VERIFICATION: 'PendingVerification',
  QUOTED: 'Quoted',
  OPEN_FOR_FUNDING: 'OpenForFunding',
  FUNDED: 'Funded',
  DISBURSED: 'Disbursed',
  SETTLED: 'Settled',
  OVERDUE_PARTIAL: 'OverduePartial',
  CANCELLED: 'Cancelled',
} as const;

export type VaultOperationState = typeof VaultOperationState[keyof typeof VaultOperationState];

export interface VaultOperationSnapshot {
  tokenId: bigint;
  /** Clave opaca bytes32 de la operación en el contrato (sin PII). */
  chainKey: string;
  /** Meta de fondeo en centavos COP registrada al abrir la operación. */
  targetCents: bigint;
  state: VaultOperationState;
  fundedCents: bigint;
  fundedUsdcUnits: bigint;
  profitPoolUsdcUnits: bigint;
  settledCents: bigint;
  settlementProofHash: string;
}

export interface VaultDepositProof {
  txHash: string;
  blockNumber: bigint;
  tokenId: bigint;
  financier: string;
  amountUsdcUnits: bigint;
  sharesCents: bigint;
}

export interface VaultClaimProof {
  txHash: string;
  blockNumber: bigint;
  tokenId: bigint;
  financier: string;
  amountUsdcUnits: bigint;
}

export interface VaultWalletSnapshot {
  address: string;
  kycVerified: boolean;
  usdcUnits: bigint;
  allowanceUnits: bigint;
}

export interface VaultLedgerPort {
  /** Clave bytes32 determinista que identifica la operación on-chain. */
  chainKeyFor(operationId: string): string;
  /** `minBlock`: lee un estado que incluya al menos ese bloque (p. ej. el del receipt). */
  getOperation(operationId: string, minBlock?: bigint): Promise<VaultOperationSnapshot | null>;
  getHolderShares(tokenId: bigint, wallet: string, minBlock?: bigint): Promise<bigint>;
  getClaimableUnits(tokenId: bigint, wallet: string): Promise<bigint>;
  getWallet(wallet: string): Promise<VaultWalletSnapshot>;
  /** Verifica el receipt y el evento OperationDeposited; lanza si no corresponde. */
  verifyDeposit(params: { txHash: string; operationId: string; wallet: string }): Promise<VaultDepositProof>;
  /** Verifica el receipt y el evento CapitalClaimed; lanza si no corresponde. */
  verifyClaim(params: { txHash: string; operationId: string; wallet: string }): Promise<VaultClaimProof>;
}

/** Error de inconsistencia entre PostgreSQL y el contrato: bloquea acciones financieras. */
export class VaultInconsistencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultInconsistencyError';
  }
}
