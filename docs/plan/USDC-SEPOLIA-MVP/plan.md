# Plan: Depósitos y retiros USDC de prueba en Sepolia

## 1. Resumen

Implementar un MVP on-chain en el que el financiador aprueba USDC de prueba, deposita fondos, recibe ERC-1155 por su aporte, observa la liquidación y retira capital más ganancia.

Metas:
- El aporte ya no queda representado solo por una operación off-chain.
- MetaMask firma `approve` y `deposit`.
- El contrato custodia temporalmente USDC de prueba y calcula retiros exactos.
- ETH de Sepolia se usa solo para pagar gas.
- COP se muestra con una tasa fija demostrativa configurable.
- El usuario comprende que no está usando USDC real ni dinero bancario.

Fase excluida:
- Conversión COP/USDC con oráculo.
- Pagos bancarios reales.
- Custodia productiva.
- Liquidación jurídica real.
- Liquidación parcial productiva.

## 2. Contexto técnico

- Red: Ethereum Sepolia, chain ID `11155111`.
- Asset de aporte: ERC-20 MockUSDC de prueba con 6 decimales.
- Asset de participación: ERC-1155 `ProoflyOperations`.
- KYC: `ProoflyKYCRegistry`.
- Firma del financiador: MetaMask.
- Firmante del operador: clave privada local del operator.
- Persistencia: PostgreSQL como fuente operativa y outbox compartido.
- Blockchain: Ethereum Sepolia como libro mayor de depósitos, participaciones y retiros.
- Unidad comercial: COP en centavos y USDC en unidad mínima de 6 decimales.
- Ejemplo demostrativo: `1 USDC demo = 4000 COP`.

## 3. Supuestos y restricciones

- AS-01: El MockUSDC es creado solo para pruebas y no tiene respaldo financiero.
- AS-02: El operator centralizado autoriza operaciones y registra liquidaciones.
- AS-03: Cada operación MVP se despliega y prueba con un financiador principal.
- AS-04: MetaMask no conserva ni recibe COP reales.
- AS-05: La tasa COP se etiqueta como demostrativa y configurable.
- AS-06: Se conserva KYC on-chain para depósito y retiro.
- AS-07: Ningún dato personal ni documento PII se escribe on-chain.
- AS-08: Los importes se manejan en enteros y ninguna UI usa `Number` para cálculos financieros.

## 4. Requisitos funcionales

- REQ-USDC-01: El financiador puede consultar su saldo de MockUSDC.
- REQ-USDC-02: MetaMask puede aprobar el monto y firmar el depósito.
- REQ-USDC-03: El contrato rechaza depósitos sin respaldo en balance/aprobación.
- REQ-USDC-04: El contrato registra el aporte contra una operación abierta.
- REQ-USDC-05: El financiamiento emitido corresponde exactamente al aporte registrado.
- REQ-USDC-06: El financiador recibe ERC-1155 por la operación.
- REQ-USDC-07: El contrato impide retirar capital no liquidado.
- REQ-USDC-08: Al liquidar, el contrato libera la participación correspondiente.
- REQ-USDC-09: La UI muestra depósito, ganancia, liquidación y retiro.
- REQ-USDC-10: Todas las configuraciones siguen siendo específicas del entorno.

## 5. Cambios de contratos

### Paso 5.1: Desplegar MockUSDC

Crear `contracts/src/MockUSDC.sol`:
- ERC-20 con 6 decimales.
- Identificador visible como USDC Demo.
- Faucet restringido o mint restringido al administrador para evitar uso comercial.

### Paso 5.2: Añadir vault a ProoflyOperations

Agregar:
- `mockUsdc` inmutable.
- `fundedUsdcByOperation[tokenId]`.
- `depositForOperation(bytes32 canonicalHmac, uint256 amountUsdc)`.
- `settleOperation` debe calcular participaciones liberables.
- `claim(tokenId)` permite retirar capital y ganancia disponibles.
- Eventos para depositar, liberar y retirar.

Reglas:
- Solo operaciones abiertas pueden recibir depósitos.
- El depositante debe tener KYC.
- El monto depositado no puede exceder el fondeo disponible.
- El ERC-1155 se mintea al caller real.
- Los fondos se mantienen en el contrato hasta liquidar.
- El claim usa aritmética entera y no puede duplicarse.
- `ReentrancyGuard` protege deposit, claim y settle.

### Paso 5.3: Desplegar nuevos contratos

Modificar `contracts/script/Deploy.s.sol` para desplegar:
- `ProoflyKYCRegistry`.
- `MockUSDC`.
- `ProoflyOperations`, con MockUSDC.

## 6. Cambios de backend

### Paso 6.1: Configuración

Añadir variables validadas:
- `MOCK_USDC_ADDRESS`.
- `DEMO_COP_PER_USDC=4000`.
- Mantener `RPC_URL`, `CHAIN_ID`, `OPERATOR_PRIVATE_KEY`.

El modo sandbox debe rechazar claves de mainnet y mostrar el badge de testnet.

### Paso 6.2: Adaptador Viem

Extender el adaptador para:
- Leer saldo y allowance de MockUSDC.
- Leer participación ERC-1155.
- Construir/transmitir aprobación y depósito.
- Leer fondos disponibles y estado de claim.
- Confirmar receipts y reintentar idempotentemente mediante outbox.

### Paso 6.3: Outbox

Convertir eventos blockchain:
- `INVESTMENT_DEPOSIT_REQUESTED`.
- `INVESTMENT_DEPOSIT_CONFIRMED`.
- `OPERATION_SETTLED`.
- `INVESTMENT_CLAIMED`.

La API registra intención y el worker confirma transacciones on-chain.

## 7. Cambios de frontend

En Ajustes:
- Mostrar red activa.
- Mostrar saldo MockUSDC.
- Mostrar dirección vinculada.

En inversión:
- Mostrar COP demostrativo y USDC necesario.
- Botón 1: Aprobar USDC.
- Botón 2: Depositar.
- Estado de aprobación y depósito.
- Hash de transacción.

En Mis inversiones:
- Token ID.
- Capital aportado en USDC.
- Equivalente COP demostrativo.
- Ganancia realizada.
- Estado liquidado.
- Botón Retirar.

No mostrar saldos o retornos como garantizados.

## 8. Prueba y despliegue

### Pruebas Solidity

Agregar pruebas para:
- Dos decimales de MockUSDC y depósitos exactos.
- Depósito sin aprobación.
- Depósito con balance insuficiente.
- Sobrefondeo.
- Doble depósito.
- Retiro antes de liquidación.
- Liquidación completa.
- Liquidación parcial.
- Doble claim.
- Reentrancia.
- KYC requerido.

### Pruebas de integración

- MetaMask se conecta a Sepolia.
- ETH Sepolia paga gas.
- Wallet recibe MockUSDC.
- Aprobar y depositar completa.
- ERC-1155 queda con el depositante.
- Liquidación desbloquea claim.
- Retiro devuelve MockUSDC.

### Despliegue

1. Desplegar MockUSDC.
2. Desplegar KYC.
3. Desplegar Operations con MockUSDC.
4. Registrar Operator y Reconciler.
5. Registrar wallet KYC.
6. Mintear MockUSDC de demostración a wallets autorizadas.
7. Actualizar `.env.local`.
8. Reiniciar API y worker.

## 9. Tareas ejecutables

- [x] T001 [G1] Crear `contracts/src/MockUSDC.sol` con 6 decimales y mint administrativo.
- [x] T002 [G1] Diseñar los estados de vault y claim en `contracts/src/ProoflyOperations.sol`.
- [x] T003 [G1] Implementar `depositForOperation` con KYC, allowance, límites y reentrancia.
- [x] T004 [G1] Implementar mint ERC-1155 al depositante en la operación.
- [x] T005 [G1] Implementar claim de capital y ganancia después de liquidación.
- [x] T006 [G1] Modificar `contracts/script/Deploy.s.sol` para desplegar MockUSDC.
- [x] T007 [G1] Añadir pruebas Foundry para depósitos, sobrefondeo, retiros y reentrancia.
- [x] T008 [G2] Añadir `MOCK_USDC_ADDRESS` y tasa COP demostrativa al env schema.
- [x] T009 [G2] Extender el adaptador Viem con balance, allowance y settlement vault.
- [x] T010 [G2] Añadir eventos de depósito y claim al outbox.
- [x] T011 [G2] Ajustar el worker para abrir operaciones y registrar settlement USDC.
- [x] T012 [G3] Añadir saldo MockUSDC y acciones Aprobar/Depositar/Retirar.
- [x] T013 [G3] Mostrar equivalencia COP demostrativa y advertencias en la UI.
- [x] T014 [G3] Mostrar hashes, token ID y estado on-chain en Mis inversiones.
- [x] T015 [Cross-cutting] Ejecutar Foundry, API, worker y pruebas UI.
- [ ] T016 [Cross-cutting] Actualizar README, `.env.example` y runbook de despliegue.

## 10. Criterios de salida

- El usuario aprueba y deposita MockUSDC desde su wallet.
- El contrato conserva exactamente el monto depositado.
- El usuario recibe ERC-1155 por su aporte.
- No puede retirar antes de liquidar.
- El claim paga exactamente capital y ganancia.
- ETH de Sepolia solo aparece como gas.
- El equivalente COP está etiquetado como demostrativo.
- Las pruebas pasan sin valores reales ni claves privadas.

## 11. Riesgos

- R1: Confundir MockUSDC con USDC real o respaldado.
- R2: Una liquidación off-chain no prueba ingreso real de fondos.
- R3: El operator central sigue pudiendo registrar estados.
- R4: Usar una wallet demo para fondos KYC no constituye KYC real.
- R5: El contrato puede quedar sin auditoría formal.

## 12. Aprobación requerida

Detenerse antes de modificar contratos hasta recibir aprobación explícita.

## Requirement Mapping

| REQ ID | Description | Plan Items | Implementation Evidence |
|---------|-------------|------------|--------------------------|
| REQ-USDC-01 | Consultar saldo MockUSDC | 6.2, 7 | Adapter Viem y UI |
| REQ-USDC-02 | Aprobar y depositar desde MetaMask | 6.2, 7 | `ProoflyOperations.depositForOperation` |
| REQ-USDC-03 | Rechazar depósitos inválidos | 5.2, 8 | Foundry tests |
| REQ-USDC-04 | Registrar aporte | 5.2, 6.3 | Vault y outbox events |
| REQ-USDC-05 | Monto exacto fondeado | 5.2, 8 | Shares y balance tests |
| REQ-USDC-06 | ERC-1155 al depositante | 5.2 | `mint` al caller |
| REQ-USDC-07 | Bloquear retiro previo | 5.2, 8 | Claim tests |
| REQ-USDC-08 | Liberar liquidación | 5.2, 6.3 | Settlement y claim |
| REQ-USDC-09 | Mostrar flujo completo | 7 | UI de inversión y portfolio |
| REQ-USDC-10 | Configuración por entorno | 6.1 | Env schema y `.env.local` |
