# Alcance y Priorización MoSCoW — Proofly (`docs/00-contexto/scope-moscow.md`)

Este documento establece la delimitación rigurosa del alcance para la versión 1.0 de **Proofly** siguiendo el marco de priorización MoSCoW, asegurando de punta a punta la viabilidad del flujo de originación para freelancers y el retorno para financiadores.

---

## 1. Matriz de Priorización MoSCoW (Versión 1.0)

| Categoría | Requerimientos / Capacidades Clave | Justificación Arquitectónica y de Negocio |
| :--- | :--- | :--- |
| **MUST HAVE**<br>*(Obligatorio para lanzamiento)* | • Onboarding ágil de freelancers y financiadores con KYC y asignación de **Tier 1 (Semilla)**.<br>• Soporte de originación dual: **Facturas electrónicas (RADIAN)** e **Hitos contractuales (Milestones)**.<br>• Enlace seguro y sin fricción para confirmación de hitos por la Empresa Contratante.<br>• Clave única canónica anti-duplicado mediante `HMAC-SHA256` en BD y contrato Solidity.<br>• Motor financiero (`FinancialEngine`) en centavos enteros con cálculo de Adelanto, Descuento, Ganancia y E.A.<br>• Marketplace de operaciones individuales con simulador de checkout en tiempo real.<br>• Contratos en Solidity sobre Base (`ProoflyKYCRegistry` y `ProoflyOperations` ERC-1155).<br>• Patrón Transactional Outbox para transacciones blockchain asíncronas e idempotentes.<br>• Cascada de pagos determinista (**Waterfall**) con Algoritmo del Mayor Resto para financiadores y pagos parciales.<br>• Conmutabilidad limpia entre **Base Sepolia (Sandbox)** y **Base Mainnet (Producción)** por configuración (`ENV_MODE`).<br>• Sistema de diseño visual **100 % Modo Claro** (`#FFFFFF`, `#F8D4FD`, `#000000`, `#7300FF`). | Constituye el núcleo mínimo viable e inviolable para operar de acuerdo a las 15 invariantes del sistema, garantizando legalidad, solidez matemática y adopción sin fricción. |
| **SHOULD HAVE**<br>*(Alta prioridad; si el tiempo lo permite)* | • Conexión de perfiles de trabajo (GitHub, Behance, LinkedIn) para modular el Score de Ejecución.<br>• Notificaciones por correo electrónico y SMS con eventos clave de fondeo, desembolso y liquidación.<br>• Generación de certificados tributarios y de retención en la fuente para financiadores.<br>• Registro auditado de eventos de conciliación con comprobantes bancarios hasheados.<br>• PWA instalable con diseño mobile-first y dock de navegación flotante. | Mejora sustancialmente la retención y confianza de los usuarios, sin bloquear el despliegue técnico del motor. |
| **COULD HAVE**<br>*(Deseable; fases posteriores)* | • Reglas de auto-fondeo (Auto-Invest) configurables por el financiador según plazo y score.<br>• Pools de liquidez colectivos (detrás de *feature flag* `ENABLE_POOLS=false` en v1.0).<br>• Integración directa con pasarelas de pago instantáneo tipo Transfiya / Bre-B para dispersión en segundos.<br>• Soporte para facturación recurrente o contratos por suscripción/retainer. | Aportan valor a escala, pero introducen complejidad operativa que debe postergarse hasta estabilizar el marketplace individual. |
| **WON'T HAVE**<br>*(Fuera de alcance v1.0 / Excluido por diseño)* | • **Token especulativo volátil:** Prohibido por la Invariante I1 (unidad de cuenta comercial es estrictamente COP).<br>• **Modo Oscuro (Dark Mode):** Excluido por la Invariante I15 (Modo Claro Absoluto obligatorio).<br>• **Mercado secundario abierto / DEX permisionless:** Prohibido por la Invariante I7 (las participaciones solo se transfieren entre cuentas con KYC verificado).<br>• **Almacenamiento de PII o PDFs on-chain:** Prohibido por la Invariante I3 y la Ley 1581 de 2012.<br>• **Custodia manual de llaves privadas por el usuario:** Web2 UX con wallets gestionadas o Smart Accounts. | Salvaguarda la seguridad regulatoria, el cumplimiento de las invariantes y evita la fricción cripto tradicional. |

---

## 2. Definición de Hecho (Definition of Done — DoD) para v1.0

Una funcionalidad de nivel MUST HAVE se considera completada únicamente cuando:
1. Su lógica de dominio en TypeScript está aislada en `packages/domain` sin dependencias de infraestructura.
2. Posee pruebas unitarias y pruebas basadas en propiedades (*property-based testing*) para cálculos financieros.
3. El contrato inteligente correspondiente cuenta con tests en Foundry (unitarios y fuzzing) y verificación de invariantes.
4. Las escrituras blockchain pasan por la tabla `outbox` con garantía de idempotencia.
5. La interfaz de usuario respeta estrictamente los Design Tokens de Proofly en Modo Claro.

