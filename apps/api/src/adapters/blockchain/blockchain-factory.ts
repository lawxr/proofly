/**
 * @proofly/api - Fábrica de adaptador Blockchain
 *
 * Selecciona la implementación de BlockchainPort según el entorno, cerrando la
 * brecha entre validateEnv() y las implementaciones concretas. Por defecto usa
 * el mock de sandbox, de modo que nada cambia hasta que se pide explícitamente
 * la conexión real con BLOCKCHAIN_ADAPTER=viem.
 */

import type { BlockchainPort } from '@proofly/domain';
import type { Hex } from 'viem';
import { SandboxBlockchainAdapter } from '../sandbox-mocks/sandbox-adapters.ts';
import { ViemBlockchainAdapter } from './viem-blockchain-adapter.ts';

export type BlockchainAdapterKind = 'mock' | 'viem';

export interface BlockchainFactoryEnv {
  BLOCKCHAIN_ADAPTER?: string;
  RPC_URL?: string;
  CHAIN_ID?: string | number;
  OPERATOR_PRIVATE_KEY?: string;
  PROOFLY_OPERATIONS_ADDRESS?: string;
  PROOFLY_KYC_REGISTRY_ADDRESS?: string;
}

export function createBlockchainAdapter(env: BlockchainFactoryEnv): BlockchainPort {
  const kind: BlockchainAdapterKind = env.BLOCKCHAIN_ADAPTER === 'viem' ? 'viem' : 'mock';
  if (kind === 'mock') {
    return new SandboxBlockchainAdapter();
  }

  const required = ['RPC_URL', 'OPERATOR_PRIVATE_KEY', 'PROOFLY_OPERATIONS_ADDRESS', 'PROOFLY_KYC_REGISTRY_ADDRESS'] as const;
  for (const key of required) {
    if (!env[key]) throw new Error(`BLOCKCHAIN_ADAPTER=viem requires ${key} to be set.`);
  }

  return new ViemBlockchainAdapter({
    rpcUrl: env.RPC_URL as string,
    chainId: Number(env.CHAIN_ID || 84532),
    operatorPrivateKey: env.OPERATOR_PRIVATE_KEY as Hex,
    operationsAddress: env.PROOFLY_OPERATIONS_ADDRESS as Hex,
    kycRegistryAddress: env.PROOFLY_KYC_REGISTRY_ADDRESS as Hex
  });
}
