# Matriz de Trazabilidad Integral — Proofly (`docs/architecture/13-traceability-matrix.md`)

Esta matriz de trazabilidad conecta de extremo a extremo las **15 Invariantes del Sistema**, los **Requisitos (RF, RN, RJ, RNF)**, el **Modelo de Datos PostgreSQL**, los **Endpoints de API** y los **Contratos Inteligentes en Base L2**.

---

## 1. Matriz de Trazabilidad de Invariantes y Componentes

| Invariante | Requisitos Asociados | Tablas y Columnas en PostgreSQL | Endpoints de API (`api/openapi.yaml`) | Componente / Función en Smart Contracts | Criterio de Verificación / Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **I1. Unidad de Cuenta COP** | RF-01, RN-01, RN-02 | `operations.nominal_amount_cents`, `participations.funded_capital_cents` | Todos los montos en formato `int64` centavos COP | Suministro de tokens ERC-1155 igual al monto en centavos | Verificación estricta de ausencia de token especulativo volátil. |
| **I2. Multi-Entorno por Config** | RNF-01, RNF-PORT-01 | Configurable por `ENV_MODE` | Servidores OpenAPI (Sandbox vs Prod) | Scripts Foundry parametrizados (`CHAIN_ID`, `RPC_URL`) | Cambio de Sandbox a Prod en $< 5\text{s}$ sin recompilar. |
| **I3. Privacidad On-Chain** | RJ-03, RNF-SEC-02 | `operations.canonical_hmac`, `operations.dossier_hash` | Endpoints procesan PII solo en capas seguras HTTPS | `canonicalHmac` y `dossierHash` almacenados como `bytes32` opacos | $0 \text{ bytes}$ de PII en Base L2 (verificado por script estático). |
| **I4. Claridad de Retornos** | RF-09, RF-11, RF-12 | `operations.discount_amount_cents`, `operations.effective_annual_rate` | `/quotes/simulate`, `/marketplace/{id}/simulate` | — | Ecuación de Tasa E.A. normalizada y validada matemáticamente. |
| **I5. Doble Financiación Bloqueada** | RF-08, RN-07 | `operations.canonical_hmac (UNIQUE)` | `/operations/invoice`, `/operations/milestone` | `isHmacRegistered[canonicalHmac]` en `ProoflyOperations.sol` | Fuzzing en Foundry y tests de colisión en PostgreSQL. |
| **I6. Emisión con Respaldo** | RF-14, RJ-01, RJ-02 | `operations.status = 'ACTIVE_FUNDED'`, `invoice_details`, `milestone_details` | `/operations/{id}/accept-quote` | `mintOperation(...)` solo ejecutable con rol autorizado | Guardas de la máquina de estados probadas en `04-state-machine.md`. |
| **I7. Transferencias Restringidas** | RN-06, RJ-04 | `kyc_verifications.status = 'VERIFIED'` | `/kyc/verify` | Hook `_update` en `ProoflyOperations` consultando `ProoflyKYCRegistry` | Test Foundry: transferencia a wallet sin KYC revierte con error. |
| **I8. Puertos y Adaptadores** | RNF-01, RNF-PORT-01 | Estructura en `packages/domain` | Todos los endpoints desacoplados | `ChainGatewayPort` implementa adaptadores Anvil/Sepolia y Mainnet | Tests unitarios aislados con mocks deterministas. |
| **I9. Exactitud Aritmética** | RN-02, RNF-ARITH-01 | Columnas `BIGINT` en centavos enteros | Payloads en centavos enteros | Montos operados como `uint256` en centavos | Algoritmo del Mayor Resto con $0 \text{ centavos}$ de pérdida residual. |
| **I10. Cascada de Pagos (Waterfall)**| RF-18, RF-19, RN-05 | `settlement_distributions`, `bank_receipts` | `/settlement/reconcile` | `settleOperation(...)` registra evidencia y saldos | Regla inmutable: Financiadores $\rightarrow$ Proofly Fee $\rightarrow$ Remanente. |
| **I11. Gobernanza Arquitectónica** | RNF-GOV-01 | ADRs 0001 a 0005 | — | — | Registro formal de cambios mediante ADRs obligatorios. |
| **I12. Inclusión Freelancers** | RF-04, RN-04 | `freelancer_profiles.tier`, `freelancer_profiles.available_quota_cents` | `/quotes/simulate` | — | Freelancers nuevos acceden a Tier Semilla ($ 2M COP) con 1 hito. |
| **I13. Financiación por Hitos** | RF-06, RF-07, RJ-02 | `milestone_details.contract_uuid`, `milestone_details.deliverable_url` | `/operations/milestone`, `/milestones/{token}/confirm` | Operaciones con tipo `CONTRACT_MILESTONE` | Flujo de confirmación por enlace seguro probado E2E. |
| **I14. Separación de Riesgos** | RF-11, R-01 | `freelancer_profiles.execution_score`, `companies.credit_score` | `/marketplace` | — | Score combinado ponderado ($0.40 S_{\text{free}} + 0.60 S_{\text{emp}}$). |
| **I15. Modo Claro Absoluto** | RNF-04, RNF-UI-01 | — | — | — | Design Tokens aplicados estrictamente (`#FFFFFF`, `#F8D4FD`, `#000000`, `#7300FF`). |

