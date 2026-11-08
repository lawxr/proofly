/**
 * @proofly/api - Adaptador Blockchain real (viem)
 *
 * Implementa BlockchainPort hablando con los contratos ProoflyOperations y
 * ProoflyKYCRegistry desplegados en una red EVM (Anvil local, Base Sepolia o
 * Base Mainnet). Reemplaza al mock de sandbox cuando BLOCKCHAIN_ADAPTER=viem.
 *
 * Nota de alcance (primera capa de conexión): el BlockchainPort del dominio
 * expone una firma simplificada (operationId, toAddress, amountTokens) que no
 * trae el dossier ni la lista real de financiadores con sus direcciones. Para
 * esta primera conexión contra una cadena real, el adaptador registra la
 * operación on-chain con la cuenta del operador como único financiador
 * (toda la participación nominal), asegurando antes su verificación KYC on-chain.
 * Enriquecer el payload (dossierHash, dueDate, financiadores reales) es la
 * siguiente capa, no este puente.
 */

import { createWalletClient, createPublicClient, http, keccak256, toHex, getContract, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { PROOFLY_OPERATIONS_ABI, PROOFLY_KYC_REGISTRY_ABI } from '@proofly/contracts-sdk';
import type { BlockchainPort } from '@proofly/domain';

export interface ViemBlockchainConfig {
  rpcUrl: string;
  chainId: number;
  operatorPrivateKey: Hex;
  operationsAddress: Hex;
  kycRegistryAddress: Hex;
}

const OPERATIONS_ABI = PROOFLY_OPERATIONS_ABI as unknown as readonly unknown[];
const KYC_ABI = PROOFLY_KYC_REGISTRY_ABI as unknown as readonly unknown[];

export class ViemBlockchainAdapter implements BlockchainPort {
  private readonly account;
  private readonly wallet;
  private readonly publicClient;
  private readonly operationsAddress: Hex;
  private readonly kycRegistryAddress: Hex;

  constructor(config: ViemBlockchainConfig) {
    this.account = privateKeyToAccount(config.operatorPrivateKey);
    const chain = {
      id: config.chainId,
      name: `evm-${config.chainId}`,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [config.rpcUrl] } }
    } as const;
    this.wallet = createWalletClient({ account: this.account, chain, transport: http(config.rpcUrl) });
    this.publicClient = createPublicClient({ chain, transport: http(config.rpcUrl) });
    this.operationsAddress = config.operationsAddress;
    this.kycRegistryAddress = config.kycRegistryAddress;
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
      // El financiador debe estar KYC-verificado on-chain antes del minteo.
      await this.ensureKyc(this.account.address);

      const operations = getContract({ address: this.operationsAddress, abi: OPERATIONS_ABI, client: { public: this.publicClient, wallet: this.wallet } });
      const canonicalHmac = this.hash32('op:' + params.operationId);
      const dossierHash = this.hash32('dossier:' + params.operationId);
      const dueDateUnix = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30);

      const hash = (await operations.write.mintOperation([
        canonicalHmac,
        dossierHash,
        params.amountTokens,
        dueDateUnix,
        [this.account.address],
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
}
