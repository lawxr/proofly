/**
 * @proofly/api - Adaptador Blockchain real (viem)
 *
 * Implementa BlockchainPort hablando con los contratos ProoflyOperations y
 * ProoflyKYCRegistry desplegados en una red EVM (Anvil local, Base Sepolia o
 * Base Mainnet). Reemplaza al mock de sandbox cuando BLOCKCHAIN_ADAPTER=viem.
 *
 * En esta capa MVP la operación se mintea para una única dirección de
 * financiador configurada por el worker. El operador sigue siendo quien firma
 * la transacción y quien debe estar autorizado en el contrato.
 */

import { createWalletClient, createPublicClient, http, keccak256, toHex, getContract, getAddress, BaseError, ContractFunctionRevertedError, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { PROOFLY_OPERATIONS_ABI, PROOFLY_KYC_REGISTRY_ABI, MOCK_USDC_ABI } from '@proofly/contracts-sdk';
import type { BlockchainPort } from '@proofly/domain';
import { ViemVaultLedger } from './viem-vault-ledger.ts';

const RECEIPT_TIMEOUT_MS = 180_000;

/** Un revert del contrato no se arregla reintentando; un fallo de red o RPC sí. */
function isPermanent(error: unknown): boolean {
  if (error instanceof BaseError) {
    return Boolean(error.walk(e => e instanceof ContractFunctionRevertedError));
  }
  return false;
}

function errorMessage(error: unknown): string {
  if (error instanceof BaseError) {
    const revert = error.walk(e => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    if (revert?.data?.errorName) {
      const args = (revert.data.args ?? []).map(arg => String(arg)).join(', ');
      return `${error.shortMessage} ${revert.data.errorName}(${args})`;
    }
    return error.shortMessage + (error.details ? ` · ${error.details}` : '');
  }
  return error instanceof Error ? error.message : String(error);
}

export interface ViemBlockchainConfig {
  rpcUrl: string;
  chainId: number;
  operatorPrivateKey: Hex;
  operationsAddress: Hex;
  kycRegistryAddress: Hex;
  mockUsdcAddress?: Hex;
}

const OPERATIONS_ABI = PROOFLY_OPERATIONS_ABI as unknown as readonly unknown[];
const KYC_ABI = PROOFLY_KYC_REGISTRY_ABI as unknown as readonly unknown[];

export class ViemBlockchainAdapter implements BlockchainPort {
  private readonly account;
  private readonly wallet;
  private readonly publicClient;
  private readonly operationsAddress: Hex;
  private readonly kycRegistryAddress: Hex;
  private readonly mockUsdcAddress?: Hex;
  private readonly ledger?: ViemVaultLedger;

  constructor(config: ViemBlockchainConfig) {
    this.account = privateKeyToAccount(config.operatorPrivateKey);
    const chain = {
      id: config.chainId,
      name: `evm-${config.chainId}`,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [config.rpcUrl] } }
    } as const;
    const transport = http(config.rpcUrl, { retryCount: 4, retryDelay: 750, timeout: 30_000 });
    this.wallet = createWalletClient({ account: this.account, chain, transport });
    this.publicClient = createPublicClient({ chain, transport });
    this.operationsAddress = config.operationsAddress;
    this.kycRegistryAddress = config.kycRegistryAddress;
    this.mockUsdcAddress = config.mockUsdcAddress;
    if (config.mockUsdcAddress) {
      this.ledger = new ViemVaultLedger({
        rpcUrl: config.rpcUrl,
        chainId: config.chainId,
        operationsAddress: config.operationsAddress,
        kycRegistryAddress: config.kycRegistryAddress,
        mockUsdcAddress: config.mockUsdcAddress
      });
    }
  }

  /** Dirección pública del operador (nunca la clave). */
  get operatorAddress(): Hex {
    return this.account.address;
  }

  get vaultLedger(): ViemVaultLedger | undefined {
    return this.ledger;
  }

  /**
   * Gas estimado sobre el bloque más reciente con 50 % de margen. Los RPC
   * públicos balancean entre nodos que pueden ir atrás; una estimación vieja
   * puede quedarse corta y la transacción revierte por OutOfGas.
   */
  private async gasFor(address: Hex, abi: readonly unknown[], functionName: string, args: unknown[]): Promise<bigint> {
    const estimate = await this.publicClient.estimateContractGas({ account: this.account, address, abi: abi as never, functionName: functionName as never, args: args as never, blockTag: 'latest' } as never);
    const padded = (estimate * 3n) / 2n;
    return padded < 80_000n ? 80_000n : padded;
  }

  /** Deriva un identificador determinista de 32 bytes a partir de una cadena. */
  private hash32(value: string): Hex {
    return keccak256(toHex(value));
  }

  private async ensureKyc(account: Hex): Promise<void> {
    const kyc = getContract({ address: this.kycRegistryAddress, abi: KYC_ABI, client: { public: this.publicClient, wallet: this.wallet } });
    const verified = (await kyc.read.isKycVerified([account])) as boolean;
    if (verified) return;
    const hash = (await kyc.write.setKycStatus([account, true])) as Hex;
    await this.publicClient.waitForTransactionReceipt({ hash });
  }

  async mintOperationTokens(params: {
    operationId: string;
    toAddress: string;
    amountTokens: bigint;
  }): Promise<{ txHash: string; success: boolean }> {
    try {
      const financier = params.toAddress as Hex;
      // El receptor debe estar KYC-verificado on-chain antes del minteo.
      await this.ensureKyc(financier);

      const operations = getContract({ address: this.operationsAddress, abi: OPERATIONS_ABI, client: { public: this.publicClient, wallet: this.wallet } });
      const canonicalHmac = this.hash32('op:' + params.operationId);
      const existingTokenId = await operations.read.hmacToTokenId([canonicalHmac]) as bigint;
      if (existingTokenId > 0n) {
        return { txHash: 'already-open-on-chain', success: true };
      }
      const dossierHash = this.hash32('dossier:' + params.operationId);
      const dueDateUnix = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30);

      const hash = (await operations.write.mintOperation([
        canonicalHmac,
        dossierHash,
        params.amountTokens,
        dueDateUnix,
        [financier],
        [params.amountTokens]
      ])) as Hex;
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      return { txHash: hash, success: receipt.status === 'success' };
    } catch (error) {
      return { txHash: error instanceof Error ? error.message : 'mint_failed', success: false };
    }
  }

  async burnOperationTokens(params: {
    operationId: string;
    receiptHash: string;
  }): Promise<{ txHash: string; success: boolean }> {
    try {
      const operations = getContract({ address: this.operationsAddress, abi: OPERATIONS_ABI, client: { public: this.publicClient, wallet: this.wallet } });
      const canonicalHmac = this.hash32('op:' + params.operationId);
      const tokenId = (await operations.read.nextTokenId([])) as bigint;
      // El contrato liquida por tokenId. Buscamos el registro cuyo hmac coincide.
      let target = 0n;
      for (let id = 1n; id < tokenId; id++) {
        const record = (await operations.read.operations([id])) as readonly unknown[];
        if (record[0] === canonicalHmac) { target = id; break; }
      }
      if (target === 0n) return { txHash: 'operation_not_found_on_chain', success: false };

      const settlementProofHash = this.hash32('receipt:' + params.receiptHash);
      const record = (await operations.read.operations([target])) as readonly unknown[];
      const nominal = record[2] as bigint;
      const hash = (await operations.write.settleOperation([target, settlementProofHash, nominal])) as Hex;
      const txReceipt = await this.publicClient.waitForTransactionReceipt({ hash });
      return { txHash: hash, success: txReceipt.status === 'success' };
    } catch (error) {
      return { txHash: error instanceof Error ? error.message : 'settle_failed', success: false };
    }
  }

  /**
   * Abre la operación en el vault con la meta de fondeo (adelanto) en centavos.
   * Idempotente por la clave on-chain: si ya existe con la misma meta no escribe;
   * si existe con otra meta lo reporta como inconsistencia permanente.
   */
  async openOperationTokens(params: {
    operationId: string;
    fundingTargetCents: bigint;
  }): Promise<{ txHash: string; success: boolean; tokenId?: bigint; alreadyOpen?: boolean; permanent?: boolean }> {
    if (!this.ledger) return { txHash: 'MOCK_USDC_ADDRESS is not configured.', success: false, permanent: true };
    try {
      const existing = await this.ledger.getOperation(params.operationId);
      if (existing) {
        if (existing.targetCents !== params.fundingTargetCents) {
          return {
            txHash: `On-chain target ${existing.targetCents} differs from off-chain advance ${params.fundingTargetCents} (tokenId ${existing.tokenId}).`,
            success: false,
            tokenId: existing.tokenId,
            permanent: true
          };
        }
        return { txHash: 'already-open-on-chain', success: true, tokenId: existing.tokenId, alreadyOpen: true };
      }

      const operations = getContract({ address: this.operationsAddress, abi: OPERATIONS_ABI, client: { public: this.publicClient, wallet: this.wallet } });
      const canonicalHmac = this.hash32('op:' + params.operationId);
      const dossierHash = this.hash32('dossier:' + params.operationId);
      const dueDateUnix = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
      const openArgs = [canonicalHmac, dossierHash, params.fundingTargetCents, dueDateUnix] as const;
      const hash = await operations.write.openOperation(openArgs, { gas: await this.gasFor(this.operationsAddress, OPERATIONS_ABI, 'openOperation', [...openArgs]) }) as Hex;
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS });
      if (receipt.status !== 'success') return { txHash: hash, success: false, permanent: true };

      // No se considera abierta hasta que el mapeo HMAC -> tokenId existe.
      const opened = await this.ledger.getOperation(params.operationId, receipt.blockNumber);
      if (!opened) return { txHash: `${hash} mined but hmacToTokenId is still 0.`, success: false };
      return { txHash: hash, success: true, tokenId: opened.tokenId };
    } catch (error) {
      return { txHash: errorMessage(error), success: false, permanent: isPermanent(error) };
    }
  }

  async onboardDemoWallet(params: {
    walletAddress: string;
    minUsdcUnits: bigint;
    mintUsdcUnits: bigint;
    minEthWei: bigint;
    topUpEthWei: bigint;
  }): Promise<{ success: boolean; actions: string[]; txHashes: string[]; detail?: string; permanent?: boolean }> {
    const actions: string[] = [];
    const txHashes: string[] = [];
    if (!this.mockUsdcAddress) return { success: false, actions, txHashes, detail: 'MOCK_USDC_ADDRESS is not configured.', permanent: true };
    try {
      const wallet = getAddress(params.walletAddress);
      const confirm = async (hash: Hex, label: string) => {
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS });
        if (receipt.status !== 'success') throw new Error(`${label} reverted: ${hash}`);
        actions.push(label); txHashes.push(hash);
      };

      const kyc = getContract({ address: this.kycRegistryAddress, abi: KYC_ABI, client: { public: this.publicClient, wallet: this.wallet } });
      if (!(await kyc.read.isKycVerified([wallet]) as boolean)) {
        const gas = await this.gasFor(this.kycRegistryAddress, KYC_ABI, 'setKycStatus', [wallet, true]);
        await confirm(await kyc.write.setKycStatus([wallet, true], { gas }) as Hex, 'kyc');
      }

      const usdcAbi = MOCK_USDC_ABI as unknown as readonly unknown[];
      const usdc = getContract({ address: this.mockUsdcAddress, abi: usdcAbi, client: { public: this.publicClient, wallet: this.wallet } });
      if (params.mintUsdcUnits > 0n && (await usdc.read.balanceOf([wallet]) as bigint) < params.minUsdcUnits) {
        const gas = await this.gasFor(this.mockUsdcAddress, usdcAbi, 'mint', [wallet, params.mintUsdcUnits]);
        await confirm(await usdc.write.mint([wallet, params.mintUsdcUnits], { gas }) as Hex, 'musdc');
      }

      if (params.topUpEthWei > 0n && (await this.publicClient.getBalance({ address: wallet })) < params.minEthWei) {
        const operatorBalance = await this.publicClient.getBalance({ address: this.account.address });
        if (operatorBalance > params.topUpEthWei * 3n) {
          await confirm(await this.wallet.sendTransaction({ to: wallet, value: params.topUpEthWei }) as Hex, 'eth');
        } else {
          actions.push('eth-skipped-operator-low');
        }
      }
      return { success: true, actions, txHashes };
    } catch (error) {
      return { success: false, actions, txHashes, detail: errorMessage(error), permanent: isPermanent(error) };
    }
  }

  async getUsdcBalance(address: Hex): Promise<bigint> {
    if (!this.mockUsdcAddress) throw new Error('MOCK_USDC_ADDRESS is not configured.');
    const usdc = getContract({ address: this.mockUsdcAddress, abi: MOCK_USDC_ABI as unknown as readonly unknown[], client: this.publicClient });
    return await usdc.read.balanceOf([address]) as bigint;
  }

  async getUsdcAllowance(owner: Hex): Promise<bigint> {
    if (!this.mockUsdcAddress) throw new Error('MOCK_USDC_ADDRESS is not configured.');
    const usdc = getContract({ address: this.mockUsdcAddress, abi: MOCK_USDC_ABI as unknown as readonly unknown[], client: this.publicClient });
    return await usdc.read.allowance([owner, this.operationsAddress]) as bigint;
  }

  /**
   * Liquida la operación en el vault: `receivedUsdc` = capital + ganancia de los
   * financiadores. Verifica estado, fondos y aprobación del operador antes de
   * escribir; nunca retira fondos de los financiadores.
   */
  async fundAndSettleOperation(params: {
    operationId: string;
    receiptHash: string;
    receivedUsdc: bigint;
  }): Promise<{ txHash: string; success: boolean; tokenId?: bigint; alreadySettled?: boolean; permanent?: boolean }> {
    if (!this.ledger || !this.mockUsdcAddress) return { txHash: 'MOCK_USDC_ADDRESS is not configured.', success: false, permanent: true };
    try {
      const vault = await this.ledger.getOperation(params.operationId);
      if (!vault) return { txHash: 'Operation is not open on-chain (hmacToTokenId = 0).', success: false, permanent: true };
      const proofHash = this.hash32('receipt:' + params.receiptHash);

      if (vault.state === 'Settled') {
        if (vault.settlementProofHash.toLowerCase() === proofHash.toLowerCase()) {
          return { txHash: 'already-settled-on-chain', success: true, tokenId: vault.tokenId, alreadySettled: true };
        }
        return { txHash: `Token ${vault.tokenId} is already settled with a different receipt.`, success: false, tokenId: vault.tokenId, permanent: true };
      }
      if (vault.state !== 'Funded') {
        return { txHash: `Token ${vault.tokenId} is ${vault.state}; settlement requires Funded.`, success: false, tokenId: vault.tokenId, permanent: true };
      }
      if (vault.fundedCents !== vault.targetCents) {
        return { txHash: `Token ${vault.tokenId} funded ${vault.fundedCents} of ${vault.targetCents} cents.`, success: false, tokenId: vault.tokenId, permanent: true };
      }
      if (params.receivedUsdc < vault.fundedUsdcUnits) {
        return { txHash: `Settlement ${params.receivedUsdc} is below funded capital ${vault.fundedUsdcUnits} mUSDC units.`, success: false, tokenId: vault.tokenId, permanent: true };
      }

      const profit = params.receivedUsdc - vault.fundedUsdcUnits;
      const usdc = getContract({ address: this.mockUsdcAddress, abi: MOCK_USDC_ABI as unknown as readonly unknown[], client: { public: this.publicClient, wallet: this.wallet } });
      if (profit > 0n) {
        const balance = await usdc.read.balanceOf([this.account.address]) as bigint;
        if (balance < profit) {
          return { txHash: `Operator ${this.account.address} holds ${balance} mUSDC units; settlement profit needs ${profit}.`, success: false, tokenId: vault.tokenId, permanent: true };
        }
        const allowance = await usdc.read.allowance([this.account.address, this.operationsAddress]) as bigint;
        if (allowance < profit) {
          const approveHash = await usdc.write.approve([this.operationsAddress, profit], { gas: await this.gasFor(this.mockUsdcAddress, MOCK_USDC_ABI as unknown as readonly unknown[], 'approve', [this.operationsAddress, profit]) }) as Hex;
          const approval = await this.publicClient.waitForTransactionReceipt({ hash: approveHash, timeout: RECEIPT_TIMEOUT_MS });
          if (approval.status !== 'success') return { txHash: approveHash, success: false, permanent: true };
        }
      }

      const operations = getContract({ address: this.operationsAddress, abi: OPERATIONS_ABI, client: { public: this.publicClient, wallet: this.wallet } });
      const settleArgs = [vault.tokenId, proofHash, params.receivedUsdc] as const;
      const hash = await operations.write.fundAndSettleOperation(settleArgs, { gas: await this.gasFor(this.operationsAddress, OPERATIONS_ABI, 'fundAndSettleOperation', [...settleArgs]) }) as Hex;
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS });
      if (receipt.status !== 'success') return { txHash: hash, success: false, tokenId: vault.tokenId, permanent: true };

      const after = await this.ledger.getOperation(params.operationId, receipt.blockNumber);
      if (after?.state !== 'Settled') return { txHash: `${hash} mined but token state is ${after?.state}.`, success: false, tokenId: vault.tokenId };
      return { txHash: hash, success: true, tokenId: vault.tokenId };
    } catch (error) {
      return { txHash: errorMessage(error), success: false, permanent: isPermanent(error) };
    }
  }
}
