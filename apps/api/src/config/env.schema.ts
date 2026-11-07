/**
 * @proofly/api - Configuración y Validación de Variables de Entorno
 * Conmutabilidad estricta Sandbox vs. Producción (Invariante I2)
 */

export interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  ENV_MODE: 'sandbox' | 'production';
  PORT: number;
  
  // Base de datos y caché
  DATABASE_URL: string;
  REDIS_URL: string;
  
  // Seguridad y Criptografía
  SERVER_HMAC_SECRET: string;
  JWT_SECRET: string;
  
  // Red Blockchain Base
  CHAIN_ID: number;
  RPC_URL: string;
  PROOFLY_OPERATIONS_ADDRESS: `0x${string}`;
  PROOFLY_KYC_REGISTRY_ADDRESS: `0x${string}`;
  OPERATOR_PRIVATE_KEY: string;
  
  // Adaptadores de Dominio
  INVOICE_ADAPTER: 'mock' | 'dian_http';
  MILESTONE_ADAPTER: 'console' | 'sendgrid';
  KYC_ADAPTER: 'mock' | 'truora';
  PAYMENT_ADAPTER: 'memory' | 'wompi_pse';
}

export function validateEnv(env: Record<string, string | undefined>): EnvConfig {
  const mode = (env.ENV_MODE || 'sandbox') as 'sandbox' | 'production';
  const nodeEnv = (env.NODE_ENV || 'development') as 'development' | 'test' | 'production';
  const port = Number(env.PORT || 3000);

  const hmacSecret = env.SERVER_HMAC_SECRET || 'proofly-default-development-hmac-secret-min-32-chars';
  if (hmacSecret.length < 32) {
    throw new Error('SERVER_HMAC_SECRET must be at least 32 characters long');
  }

  const jwtSecret = env.JWT_SECRET || 'proofly-default-development-jwt-secret-min-32-chars';
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  const chainId = mode === 'production' ? 8453 : 84532;
  const defaultRpc = mode === 'production' ? 'https://mainnet.base.org' : 'https://sepolia.base.org';

  return {
    NODE_ENV: nodeEnv,
    ENV_MODE: mode,
    PORT: port,
    DATABASE_URL: env.DATABASE_URL || 'postgresql://proofly:proofly_secret@localhost:5432/proofly_db',
    REDIS_URL: env.REDIS_URL || 'redis://localhost:6379',
    SERVER_HMAC_SECRET: hmacSecret,
    JWT_SECRET: jwtSecret,
    CHAIN_ID: Number(env.CHAIN_ID || chainId),
    RPC_URL: env.RPC_URL || defaultRpc,
    PROOFLY_OPERATIONS_ADDRESS: (env.PROOFLY_OPERATIONS_ADDRESS || '0x0000000000000000000000000000000000000001') as `0x${string}`,
    PROOFLY_KYC_REGISTRY_ADDRESS: (env.PROOFLY_KYC_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000002') as `0x${string}`,
    OPERATOR_PRIVATE_KEY: env.OPERATOR_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001',
    INVOICE_ADAPTER: (env.INVOICE_ADAPTER || (mode === 'production' ? 'dian_http' : 'mock')) as 'mock' | 'dian_http',
    MILESTONE_ADAPTER: (env.MILESTONE_ADAPTER || (mode === 'production' ? 'sendgrid' : 'console')) as 'console' | 'sendgrid',
    KYC_ADAPTER: (env.KYC_ADAPTER || (mode === 'production' ? 'truora' : 'mock')) as 'mock' | 'truora',
    PAYMENT_ADAPTER: (env.PAYMENT_ADAPTER || (mode === 'production' ? 'wompi_pse' : 'memory')) as 'memory' | 'wompi_pse'
  };
}

