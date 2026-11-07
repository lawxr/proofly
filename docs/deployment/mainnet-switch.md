# Guía de Conmutación a Producción: Base Mainnet (`docs/deployment/mainnet-switch.md`)

**Versión:** 1.0.0  
**Fecha de Publicación:** 2026-11-07  
**Red Destino:** Base L2 Mainnet (`chainId: 8453`)  
**Moneda de Liquidación:** Pesos Colombianos (COP) en centavos enteros  

---

## 1. Resumen de Arquitectura de Producción

Proofly opera como un sistema híbrido fintech donde el libro mayor relacional (PostgreSQL) y el libro mayor inmutable en Base L2 (`ProoflyKYCRegistry.sol` y `ProoflyOperations.sol`) coexisten mediante el patrón Transactional Outbox.

Esta guía documenta los pasos secuenciales requeridos para promover el entorno de pruebas (Base Sepolia / Sandbox) a **Base Mainnet en Producción**.

---

## 2. Matriz de Variables de Entorno de Producción

| Variable | Valor en Sandbox / Sepolia | Valor Requerido en Base Mainnet | Descripción / Propósito |
| :--- | :--- | :--- | :--- |
| `ENV_MODE` | `sandbox` | `production` | Activa invariantes estrictas de producción en el schema Zod. |
| `PORT` | `3000` | `3000` | Puerto del servicio REST de la API. |
| `DATABASE_URL` | `postgresql://...localhost:5432...` | `postgresql://proofly_prod:...@rds.amazonaws.com:5432/proofly` | Conexión SSL obligatoria a PostgreSQL RDS con réplicas. |
| `CHAIN_ID` | `84532` (Base Sepolia) | `8453` (Base Mainnet) | Identificador de red EVM para Base L2. |
| `BASE_RPC_URL` | `https://sepolia.base.org` | `https://mainnet.base.org` o RPC dedicado (Alchemy/QuickNode) | Endpoint RPC de alta disponibilidad con rate limits ampliados. |
| `OPERATOR_PRIVATE_KEY` | Llave efímera de pruebas | Secret Manager (`arn:aws:secretsmanager:...`) | Llave privada de la billetera operadora encargada del minteo. |
| `KYC_REGISTRY_ADDRESS` | `0x...` (Sepolia) | `0x...` (Mainnet desplegado) | Dirección del contrato de registro de identidad KYC verificado. |
| `PROOFLY_OPERATIONS_ADDRESS`| `0x...` (Sepolia) | `0x...` (Mainnet desplegado) | Dirección del contrato ERC-1155 fraccionado de operaciones. |
| `HMAC_SERVER_SECRET` | Sal de pruebas | Clave criptográfica aleatoria de 64 caracteres hex | Sal secreta para generar hashes inmutables de facturas e hitos. |
| `CONFIRMATION_TOKEN_SECRET`| Clave de pruebas | Clave criptográfica aleatoria de 64 caracteres hex | Sal secreta para emisión de enlaces de confirmación para pagadores. |
| `RADIAN_ENV` | `sandbox` | `production` | Conexión con servicios web de la DIAN para consulta de acuses. |

---

## 3. Procedimiento de Despliegue de Smart Contracts en Base Mainnet

### Requisitos Previos
1. Billetera de despliegue (*Deployer Key*) fondeada con suficiente ETH en Base Mainnet para gas (aproximadamente $0.005\text{ ETH}$).
2. API Key de BaseScan (Etherscan v2) configurada para la verificación de código fuente.

### Paso 1: Compilación Limpia
```bash
cd contracts
~/.foundry/bin/forge clean
~/.foundry/bin/forge build --sizes
```

### Paso 2: Despliegue de `ProoflyKYCRegistry`
```bash
~/.foundry/bin/forge create src/ProoflyKYCRegistry.sol:ProoflyKYCRegistry \
  --rpc-url $BASE_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```
*Anotar la dirección obtenida como `$KYC_REGISTRY_ADDRESS`.*

### Paso 3: Despliegue de `ProoflyOperations`
```bash
~/.foundry/bin/forge create src/ProoflyOperations.sol:ProoflyOperations \
  --rpc-url $BASE_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args "$KYC_REGISTRY_ADDRESS" \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```
*Anotar la dirección obtenida como `$PROOFLY_OPERATIONS_ADDRESS`.*

### Paso 4: Autorización de la Billetera Operadora (Worker)
El worker asíncrono necesita permisos de operador en ambos contratos para mintear y actualizar KYC:

```bash
# Autorizar al worker en el KYC Registry
cast send $KYC_REGISTRY_ADDRESS \
  "setOperator(address,bool)" \
  $WORKER_OPERATOR_ADDRESS true \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL

# Autorizar al worker en ProoflyOperations
cast send $PROOFLY_OPERATIONS_ADDRESS \
  "setOperator(address,bool)" \
  $WORKER_OPERATOR_ADDRESS true \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL
```

---

## 4. Lista de Verificación Pre-Vuelo (Pre-Flight Checklist)

- [ ] **1. Contratos Verificados:** El código fuente de `ProoflyKYCRegistry` y `ProoflyOperations` es visible y verificado públicamente en [BaseScan Mainnet](https://basescan.org).
- [ ] **2. Saldo de Gas del Operador:** La billetera operadora `$WORKER_OPERATOR_ADDRESS` cuenta con saldo $> 0.05\text{ ETH}$ en Base Mainnet y alerta de recarga automática en Datadog / PagerDuty si baja de $0.01\text{ ETH}$.
- [ ] **3. Migraciones PostgreSQL:** La base de datos de producción cuenta con las tablas `operations`, `participations`, `outbox_events` y los tipos ENUM creados y con índices únicos aplicados.
- [ ] **4. Conectividad RADIAN:** Certificado digital vigente (.p12) cargado en la bóveda de secretos para firma de peticiones SOAP hacia la DIAN.
- [ ] **5. Suite de Humo en Frío:** Ejecución de prueba de conectividad y balance:
  ```bash
  cast call $PROOFLY_OPERATIONS_ADDRESS "kycRegistry()(address)" --rpc-url $BASE_RPC_URL
  # Debe responder exactamente la dirección $KYC_REGISTRY_ADDRESS
  ```

---

## 5. Protocolo de Reversión y Emergencia

En caso de detectarse alguna anomalía crítica post-lanzamiento:
1. **Pausar Nuevas Originaciones en API:**
   - Cambiar `ORIGINATIONS_ENABLED=false` en el API Gateway para responder `503 Service Temporarily Paused`.
2. **Revocar Permisos al Operador On-Chain:**
   - El administrador (*Deployer Multi-Sig*) puede revocar inmediatamente las facultades de minteo al worker:
   ```bash
   cast send $PROOFLY_OPERATIONS_ADDRESS "setOperator(address,bool)" $WORKER_OPERATOR_ADDRESS false --rpc-url $BASE_RPC_URL
   ```
3. **Auditar Libros Contables:**
   - Correr el script forense `npm run worker:reconcile -- --mode=dry-run` para validar que los balances se mantengan intactos.
