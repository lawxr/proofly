/**
 * @proofly/contracts-sdk
 * ABIs y constantes para Base Sepolia y Base Mainnet
 */

import KYCRegistryAbi from './abis/ProoflyKYCRegistry.json' with { type: 'json' };
import OperationsAbi from './abis/ProoflyOperations.json' with { type: 'json' };

export const PROOFLY_KYC_REGISTRY_ABI = KYCRegistryAbi;
export const PROOFLY_OPERATIONS_ABI = OperationsAbi;

export const BASE_CHAIN_IDS = {
  SEPOLIA: 84532,
  MAINNET: 8453
} as const;

