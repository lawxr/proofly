# Conexión blockchain real — primera capa (Anvil)

- Objetivo: dejar de ser sandbox en memoria y empezar conexiones reales sobre testnet, empezando por Anvil local. Primera capa: adaptador blockchain real (viem) contra los contratos ProoflyOperations/KYCRegistry desplegados, cableado al worker vía fábrica seleccionada por entorno. Default mock preservado.
- Runner: `scripts/verify-chain.mjs`, `scripts/verify-worker-chain.mjs`, suite de tests existente.

## Contexto del estado real (verificado antes de tocar código)

- El runtime vivía 100% en memoria + mocks. `createDependencies()` ignoraba `validateEnv()`. No existía cliente de cadena (sin viem/ethers/web3), ni driver pg, ni outbox compartido entre api y worker.
- Contratos Solidity reales y desplegables (ERC-1155 `ProoflyOperations` + `ProoflyKYCRegistry`), ABIs en `packages/contracts-sdk`, deploy script Foundry listo.

## Specs

- S1: Anvil local en chain-id 84532; contratos desplegados con el deploy script. Direcciones deterministas registradas.
- S2: Adaptador `ViemBlockchainAdapter` que implementa `BlockchainPort` hablando con los contratos reales (mint real con KYC on-chain, settle real). Puente de alcance documentado: el payload del puerto no trae financiadores/dossier reales, así que el operador actúa como financiador único KYC-verificado; enriquecer el payload es la siguiente capa.
- S3: Fábrica `createBlockchainAdapter(env)` que selecciona viem vs mock según `BLOCKCHAIN_ADAPTER`. Default = mock (no rompe nada).
- S4: Worker cableado a la fábrica (deja de usar su mock hardcodeado). Con `BLOCKCHAIN_ADAPTER=viem` procesa `OPERATION_FULLY_FUNDED` minteando on-chain.
- S5: `.env.anvil` reproducible (clave pública de Anvil), fuera de git.

## Tasks

- T1 (S1): Arrancar Anvil + desplegar contratos. Hecho. KYC=0x5fbd…0aa3, Operations=0xe7f1…0512.
- T2 (S2): `apps/api/src/adapters/blockchain/viem-blockchain-adapter.ts`. Hecho.
- T3 (S3): `apps/api/src/adapters/blockchain/blockchain-factory.ts`. Hecho.
- T4 (S4): Cablear worker `apps/worker/src/main.ts`. Hecho.
- T5 (S5): `.env.anvil` + gitignore. Hecho.
- T6: Verificación. Hecho.

## Log

- L1: "ve haciendo las primeras conexiones para que funcione realmente, esto no es una demo es un producto privado en desarrollo, usemos alguna red testnet". Decisión: empezar por Anvil local (determinista) antes de Base Sepolia; mover a Sepolia luego cambiando solo RPC_URL/CHAIN_ID/direcciones.
- L2: instalado viem@2 en raíz y en @proofly/api; añadido @proofly/api + viem como deps del worker. Vulnerabilidades preexistentes (esbuild/vite dev server, zod v3) NO abordadas: upgrades breaking fuera de alcance.
- L3: Puente de alcance en el adaptador (operador como financiador único on-chain) por limitación de la firma de `BlockchainPort`. Documentado en el archivo del adaptador. Riesgo item 2 (seguridad/claves) + item 3 (contrato on-chain): mitigado para Anvil, debe revisarse antes de Sepolia/mainnet.
- L4: Verificación — todo verde:
  - `forge script Deploy`: ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.
  - `scripts/verify-chain.mjs`: mint real → estado Funded → settle real → estado Settled, on-chain.
  - `verify-worker-chain.mjs`: worker→dispatcher→adaptador viem mintea OPERATION_FULLY_FUNDED on-chain y marca COMPLETED.
  - fábrica sin config → adaptador MOCK (default seguro).
  - suite completa: 36/36 (dominio, api, worker, demo-server, private-app).
- Riesgo: Risk item 2 (claves/seguridad) y item 5 (entorno/cadena). Mitigado en Anvil con clave pública local; antes de Sepolia hay que gestionar una clave de operador real fuera de git y revisar el puente de financiadores.

## Siguientes capas (no hechas, pendientes de tu visto bueno)

1. Enriquecer el payload del outbox (dossierHash, dueDate, financiadores reales con direcciones y shares) y ampliar `BlockchainPort` para reflejar el contrato.
2. Outbox compartido real (Postgres) entre api y worker — hoy siguen en memorias separadas.
3. Driver pg concreto + `createDependencies(config)` que elija repos Postgres por entorno.
4. Mover a Base Sepolia (faucet, clave de operador segura, direcciones nuevas).
5. Proveedores externos reales (DIAN, Truora, Wompi, email) — fase aparte, requieren cuentas/credenciales.
