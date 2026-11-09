# Contratos ERC-1155 reales con OpenZeppelin

- Objetivo: que ProoflyOperations sea un ERC-1155 de verdad (reconocible por wallets/exploradores), extendiendo la implementación auditada de OpenZeppelin en vez de reimplementar balances/transfers a mano. Preservar la lógica de dominio: anti-duplicado por HMAC, estados de operación, settlement (full/partial), y gating KYC en transferencias. Base del MVP académico: contratos buenos antes de desplegar a testnet.
- Branch: feat/erc1155-contracts (encadenada sobre main).
- Delivery strategy: ask-on-risk.
- Runner: `forge test` (Foundry 1.9.0 en ~/.foundry/bin; OpenZeppelin v5.7.0 instalado en lib/).

## Specs

- S1: ProoflyOperations extiende `ERC1155` de OpenZeppelin v5.7.0. Expone la interfaz estándar completa (balanceOf, balanceOfBatch, setApprovalForAll, isApprovedForAll, safeTransferFrom, safeBatchTransferFrom, supportsInterface/ERC-165, uri) heredada de OZ — ya no reimplementada a mano.
- S2: Se preserva la lógica de dominio:
  - Anti-duplicado: un mismo canonicalHmac no puede mintearse dos veces (OperationAlreadyRegistered).
  - mintOperation exige que la suma de shares == nominalAmountCents.
  - Estados: Funded -> Settled (recaudo completo) | OverduePartial (parcial), vía settleOperation (onlyReconciler).
  - Roles: admin, operator (mint), reconciler (settle).
- S3: Gating KYC en toda transferencia de tokens (incluido el mint inicial a financiadores): ninguna dirección sin KYC puede recibir participaciones. Implementado en el hook `_update` de OZ v5 (se ejecuta en mint/transfer/burn), de modo que también cubre safeBatchTransferFrom y approvals.
- S4: Reentrancy guard en settleOperation (y donde aplique). Admin vía Ownable de OZ o rol explícito.
- S5: `forge build` limpio y `forge test` verde, incluyendo los tests existentes adaptados al estándar (balanceOf(addr,id) en vez de balances(id,addr)) y el fuzzing de no-doble-mint y conservación de supply.
- S6: El adaptador viem del backend (apps/api/.../viem-blockchain-adapter.ts) sigue compilando/funcionando contra la nueva ABI (mint/settle). Si cambian firmas o nombres de eventos, se ajusta el adaptador y su verificación.

## Tasks

- T1: Añadir OpenZeppelin v5.7.0 (hecho: lib/openzeppelin-contracts) + remappings en foundry.toml (hecho). Route: inline. Risk: item 5 (dependencias).
- T2 (S1,S2,S3,S4): Reescribir ProoflyOperations extendiendo ERC1155 de OZ; _update para gating KYC; ReentrancyGuard; Ownable. Preservar mint/settle/estados/HMAC. Route: inline. Risk: item 1+3 (contrato que maneja titularidad; API que el backend consume).
- T3 (S5): Adaptar ProoflyOperations.t.sol al estándar ERC-1155 (balanceOf) sin perder cobertura (incluye fuzzing). Route: inline. Risk: none (tests).
- T4 (S5): forge build + forge test verdes. Route: inline. Risk: none.
- T5 (S6): Verificar/ajustar el adaptador viem del backend contra la nueva ABI; correr su verificación si Anvil está disponible, o anotar como no verificado. Route: inline. Risk: item 3.

## Log

- L1: "okay pero es un mvp academico no se va a usar... lo primero seria tener buenos contratos inteligentes" + "si hazlo". Alcance: MVP académico, sin regulatorio/pagos reales. Prioridad 1 = contratos buenos. Diagnóstico del código actual: ProoflyOperations dice ser ERC-1155 pero no lo es (faltan balanceOf, approvals, supportsInterface, callbacks, uri; reimplementa balances/transfers a mano; sin reentrancy guard). Entorno: Foundry 1.9.0 estaba en ~/.foundry/bin (no en PATH); OpenZeppelin no estaba -> instalado v5.7.0 via forge install. Decisión: extender ERC1155 de OZ, gating KYC en hook _update (canónico v5, cubre todas las rutas de transferencia). Riesgo: item 1 (titularidad de participaciones) + item 3 (ABI que el backend viem consume).

- L2: Implementado y verificado. Cambios:
  - Entorno: Foundry 1.9.0 usable vía ~/.foundry/bin (no en PATH). OpenZeppelin v5.7.0 instalado en lib/openzeppelin-contracts (forge install; el clone terminó aunque el comando colgó en la parte interactiva de git). Remappings añadidos a foundry.toml (@openzeppelin/contracts/, forge-std/).
  - ProoflyOperations.sol reescrito: extiende ERC1155 + Ownable + ReentrancyGuard de OZ. Balances/transfers delegados a OZ (ya no mapping manual). Gating KYC del receptor en el hook _update (cubre mint/transfer/batch; permite burn to==0). mintOperation/settleOperation/estados/HMAC/roles preservados. Admin vía Ownable. Nuevo custom error SharesDoNotEqualNominal (antes string). URI base https://proofly.co/operations/{id}.json.
  - Tests adaptados al estándar: balances(id,addr) -> balanceOf(addr,id); safeTransferFrom con 5º arg data; revert de shares como custom error. Añadidos: test_SupportsERC1155Interface (ERC-165: 0xd9b67a26 ERC-1155, 0x0e89341c metadata, 0x01ffc9a7 ERC-165) y test_ApprovedOperatorCanTransfer (setApprovalForAll + transfer por operador, gated KYC).
  - ABIs regeneradas desde los artefactos nuevos (forge inspect) en packages/contracts-sdk/src/abis/ProoflyOperations.json y ProoflyKYCRegistry.json. Verificado que las funciones que el adaptador viem consume (mintOperation, settleOperation, operations[7 campos], isKycVerified, setKycStatus) siguen presentes; la ABI nueva es un superset compatible.
- L3: Verificación:
  - forge test: 20/20 verdes (incluye 10.000 iteraciones de fuzzing en no-doble-mint y conservación de supply; conformidad ERC-165; operador aprobado).
  - forge build: limpio (solo warnings de lint preexistentes en KYCRegistry).
  - Suite Node: 48/48 (backend compila/funciona con las ABIs nuevas).
  - Compatibilidad de ABI con el adaptador viem confirmada por inspección (mint/settle/operations intactos).
- No verificado: verify-chain.mjs end-to-end on-chain (Anvil no estaba corriendo). La compatibilidad de firma/ABI sí está confirmada; falta el round-trip real cuando se levante Anvil o se despliegue a Base Sepolia (ese es el siguiente frente del plan).
- Riesgo: item 1 (titularidad de participaciones) — mitigado: ERC-1155 auditado de OZ, 20/20 tests incl. fuzzing de conservación; lógica de dominio (HMAC, respaldo total, estados) preservada y testeada. item 3 (ABI que el backend consume) — mitigado: ABIs regeneradas, funciones consumidas verificadas presentes, suite Node verde.
- Siguiente en el plan del MVP académico: (2) desplegar a Base Sepolia (depende de este feature + wallet con ETH testnet), (3) DIAN (investigar factibilidad real primero), (4) UX/gráficos reales conectando lo desplegado.
