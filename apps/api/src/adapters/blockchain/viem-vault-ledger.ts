/**
 * @proofly/api - Libro mayor del vault mUSDC (viem, solo lectura)
 *
 * Implementa VaultLedgerPort: lee el estado de ProoflyOperations/MockUSDC/KYC
 * y verifica receipts de depósito y retiro. No recibe ni usa claves privadas,
 * de modo que la API puede validar pruebas on-chain sin capacidad de firmar.
 */

import {
  createPublicClient,
  http,
  keccak256,
  toHex,
  getAddress,
  decodeEventLog,
  isAddressEqual,
  TransactionReceiptNotFoundError,
  type Abi,
  type Hex,
  type TransactionReceipt
} from 'viem';
import { PROOFLY_OPERATIONS_ABI, PROOFLY_KYC_REGISTRY_ABI, MOCK_USDC_ABI } from '@proofly/contracts-sdk';
import type {
  VaultLedgerPort,
  VaultOperationSnapshot,
  VaultOperationState,
  VaultDepositProof,
  VaultClaimProof,
  VaultWalletSnapshot
} from '@proofly/domain';

const OPERATIONS_ABI = PROOFLY_OPERATIONS_ABI as unknown as Abi;
const KYC_ABI = PROOFLY_KYC_REGISTRY_ABI as unknown as Abi;
const USDC_ABI = MOCK_USDC_ABI as unknown as Abi;

const STATES: VaultOperationState[] = [
  'Draft', 'PendingConfirmation', 'PendingVerification', 'Quoted', 'OpenForFunding',
  'Funded', 'Disbursed', 'Settled', 'OverduePartial', 'Cancelled'
];

export interface ViemVaultLedgerConfig {
  rpcUrl: string;
  chainId: number;
  operationsAddress: string;
  kycRegistryAddress: string;
  mockUsdcAddress: string;
  /** Tiempo máximo para que el receipt aparezca en el RPC del backend. */
  receiptTimeoutMs?: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class ViemVaultLedger implements VaultLedgerPort {
  readonly client;
  readonly chainId: number;
  readonly operationsAddress: Hex;
  readonly kycRegistryAddress: Hex;
  readonly mockUsdcAddress: Hex;
  private readonly receiptTimeoutMs: number;

  constructor(config: ViemVaultLedgerConfig) {
    const chain = {
      id: config.chainId,
      name: `evm-${config.chainId}`,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [config.rpcUrl] } }
    } as const;
    this.client = createPublicClient({ chain, transport: http(config.rpcUrl, { retryCount: 4, retryDelay: 750, timeout: 20_000 }) });
    this.chainId = config.chainId;
    this.operationsAddress = getAddress(config.operationsAddress);
    this.kycRegistryAddress = getAddress(config.kycRegistryAddress);
    this.mockUsdcAddress = getAddress(config.mockUsdcAddress);
    this.receiptTimeoutMs = config.receiptTimeoutMs ?? 45_000;
  }

  chainKeyFor(operationId: string): string {
    return keccak256(toHex('op:' + operationId));
  }

  private read<T>(address: Hex, abi: Abi, functionName: string, args: unknown[] = [], blockNumber?: bigint): Promise<T> {
    return this.client.readContract({ address, abi, functionName, args, ...(blockNumber ? { blockNumber } : {}) }) as Promise<T>;
  }

  /**
   * Bloque de lectura que incluye al menos `minBlock`. Los RPC públicos balancean
   * entre nodos que pueden ir algunos bloques atrás; se espera a que alcancen.
   */
  private async readBlock(minBlock?: bigint): Promise<bigint | undefined> {
    if (!minBlock) return undefined;
    const deadline = Date.now() + this.receiptTimeoutMs;
    for (;;) {
      const latest = await this.client.getBlockNumber({ cacheTime: 0 });
      if (latest >= minBlock) return latest;
      if (Date.now() > deadline) throw new Error(`RPC is behind block ${minBlock} (latest ${latest}).`);
      await sleep(1_500);
    }
  }

  /** Reintenta lecturas en un bloque fijo si el nodo aún no lo conoce. */
  private async withBlock<T>(minBlock: bigint | undefined, load: (blockNumber?: bigint) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const blockNumber = await this.readBlock(minBlock);
      try {
        return await load(blockNumber);
      } catch (error) {
        if (!minBlock || attempt >= 5) throw error;
        await sleep(1_500);
      }
    }
  }

  /** Centavos COP por mUSDC fijados en el contrato desplegado. */
  async copCentsPerUsdc(): Promise<bigint> {
    return this.read<bigint>(this.operationsAddress, OPERATIONS_ABI, 'COP_CENTS_PER_USDC');
  }

  async getOperation(operationId: string, minBlock?: bigint): Promise<VaultOperationSnapshot | null> {
    return this.withBlock(minBlock, blockNumber => this.loadOperation(operationId, blockNumber));
  }

  private async loadOperation(operationId: string, blockNumber?: bigint): Promise<VaultOperationSnapshot | null> {
    const chainKey = this.chainKeyFor(operationId);
    const tokenId = await this.read<bigint>(this.operationsAddress, OPERATIONS_ABI, 'hmacToTokenId', [chainKey], blockNumber);
    if (tokenId === 0n) return null;
    const [record, fundedCents, fundedUsdcUnits, profitPoolUsdcUnits] = await Promise.all([
      this.read<readonly unknown[]>(this.operationsAddress, OPERATIONS_ABI, 'operations', [tokenId], blockNumber),
      this.read<bigint>(this.operationsAddress, OPERATIONS_ABI, 'fundedCentsByOperation', [tokenId], blockNumber),
      this.read<bigint>(this.operationsAddress, OPERATIONS_ABI, 'fundedUsdcByOperation', [tokenId], blockNumber),
      this.read<bigint>(this.operationsAddress, OPERATIONS_ABI, 'settlementPoolUsdcByOperation', [tokenId], blockNumber)
    ]);
    // Un nodo atrasado puede ver el mapeo HMAC pero no el registro: es atraso del
    // RPC, no una inconsistencia. Se lanza como error transitorio para reintentar.
    if ((record[2] as bigint) === 0n) throw new Error(`RPC lag: token ${tokenId} has no record yet.`);
    return {
      tokenId,
      chainKey,
      targetCents: record[2] as bigint,
      state: STATES[Number(record[4])] ?? 'Draft',
      fundedCents,
      fundedUsdcUnits,
      profitPoolUsdcUnits,
      settledCents: record[5] as bigint,
      settlementProofHash: record[6] as string
    };
  }

  async getHolderShares(tokenId: bigint, wallet: string, minBlock?: bigint): Promise<bigint> {
    return this.withBlock(minBlock, blockNumber =>
      this.read<bigint>(this.operationsAddress, OPERATIONS_ABI, 'balanceOf', [getAddress(wallet), tokenId], blockNumber));
  }

  async getClaimableUnits(tokenId: bigint, wallet: string): Promise<bigint> {
    return this.read<bigint>(this.operationsAddress, OPERATIONS_ABI, 'claimableUsdc', [tokenId, getAddress(wallet)]);
  }

  async getWallet(wallet: string): Promise<VaultWalletSnapshot> {
    const address = getAddress(wallet);
    const [kycVerified, usdcUnits, allowanceUnits] = await Promise.all([
      this.read<boolean>(this.kycRegistryAddress, KYC_ABI, 'isKycVerified', [address]),
      this.read<bigint>(this.mockUsdcAddress, USDC_ABI, 'balanceOf', [address]),
      this.read<bigint>(this.mockUsdcAddress, USDC_ABI, 'allowance', [address, this.operationsAddress])
    ]);
    return { address, kycVerified, usdcUnits, allowanceUnits };
  }

  /**
   * Espera el receipt en el RPC del backend. El RPC de MetaMask puede ir uno o
   * dos bloques por delante, así que se reintenta antes de rechazar la prueba.
   */
  async receipt(txHash: string): Promise<TransactionReceipt> {
    const hash = txHash as Hex;
    const deadline = Date.now() + this.receiptTimeoutMs;
    for (;;) {
      try {
        return await this.client.getTransactionReceipt({ hash });
      } catch (error) {
        if (!(error instanceof TransactionReceiptNotFoundError)) throw error;
        if (Date.now() > deadline) throw new Error('Transaction receipt not found on the configured network.');
        await sleep(2_000);
      }
    }
  }

  private decode(receipt: TransactionReceipt, eventName: 'OperationDeposited' | 'CapitalClaimed') {
    const decoded: { tokenId: bigint; financier: string; amountUsdc: bigint; sharesCents?: bigint }[] = [];
    for (const log of receipt.logs) {
      if (!isAddressEqual(log.address, this.operationsAddress)) continue;
      try {
        const event = decodeEventLog({ abi: OPERATIONS_ABI, data: log.data, topics: log.topics });
        if (event.eventName !== eventName) continue;
        decoded.push(event.args as unknown as { tokenId: bigint; financier: string; amountUsdc: bigint; sharesCents?: bigint });
      } catch { /* log de otro evento */ }
    }
    return decoded;
  }

  async verifyDeposit(params: { txHash: string; operationId: string; wallet: string }): Promise<VaultDepositProof> {
    const receipt = await this.receipt(params.txHash);
    if (receipt.status !== 'success') throw new Error('The deposit transaction reverted on-chain.');
    const tokenId = await this.read<bigint>(this.operationsAddress, OPERATIONS_ABI, 'hmacToTokenId', [this.chainKeyFor(params.operationId)]);
    if (tokenId === 0n) throw new Error('The operation is not open on-chain yet.');
    const match = this.decode(receipt, 'OperationDeposited')
      .find(event => event.tokenId === tokenId && isAddressEqual(event.financier as Hex, getAddress(params.wallet)));
    if (!match) throw new Error('The transaction has no deposit for this operation and linked wallet.');
    return {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      tokenId,
      financier: getAddress(params.wallet),
      amountUsdcUnits: match.amountUsdc,
      sharesCents: match.sharesCents ?? 0n
    };
  }

  async verifyClaim(params: { txHash: string; operationId: string; wallet: string }): Promise<VaultClaimProof> {
    const receipt = await this.receipt(params.txHash);
    if (receipt.status !== 'success') throw new Error('The claim transaction reverted on-chain.');
    const tokenId = await this.read<bigint>(this.operationsAddress, OPERATIONS_ABI, 'hmacToTokenId', [this.chainKeyFor(params.operationId)]);
    if (tokenId === 0n) throw new Error('The operation is not open on-chain.');
    const match = this.decode(receipt, 'CapitalClaimed')
      .find(event => event.tokenId === tokenId && isAddressEqual(event.financier as Hex, getAddress(params.wallet)));
    if (!match) throw new Error('The transaction has no claim for this operation and linked wallet.');
    return {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      tokenId,
      financier: getAddress(params.wallet),
      amountUsdcUnits: match.amountUsdc
    };
  }
}

/** Crea el ledger si el entorno configura el vault on-chain; si no, null (modo COP heredado). */
export function createVaultLedgerFromEnv(env: Record<string, string | undefined>): ViemVaultLedger | null {
  if (env.BLOCKCHAIN_ADAPTER !== 'viem' || !env.MOCK_USDC_ADDRESS) return null;
  for (const key of ['RPC_URL', 'PROOFLY_OPERATIONS_ADDRESS', 'PROOFLY_KYC_REGISTRY_ADDRESS'] as const) {
    if (!env[key]) throw new Error(`The mUSDC vault requires ${key} to be set.`);
  }
  return new ViemVaultLedger({
    rpcUrl: env.RPC_URL as string,
    chainId: Number(env.CHAIN_ID || 84532),
    operationsAddress: env.PROOFLY_OPERATIONS_ADDRESS as string,
    kycRegistryAddress: env.PROOFLY_KYC_REGISTRY_ADDRESS as string,
    mockUsdcAddress: env.MOCK_USDC_ADDRESS as string
  });
}
