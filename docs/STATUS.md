# Estado del Proyecto — Proofly (`docs/STATUS.md`)

Última actualización: 2026-11-07  
Estado general: **FASE 6 COMPLETADA AL 100 % · Esperando «APROBADO FASE 6»**  
Rama activa: `main`

---

## 1. Resumen Ejecutivo de Estado
La **Fase 6 (Frontend Web & Mobile Fintech en Modo Claro Absoluto)** ha sido completada con éxito:
- **`apps/web/src/components/Navbar.tsx`:**
  - Barra superior flotante con backdrop-blur, isotipo starburst, marca Proofly, enlaces ancla y CTA píldora negro.
- **`apps/web/src/components/Hero.tsx`:**
  - Marco envolvente con gradiente lavanda pastel (`#F8D4FD` a `#FFF8FE`) y filigranas starburst.
  - Lienzo blanco interior con titular display y revelación typewriter (`Liquidez hecha simple.`).
  - 4 tarjetas polaroid flotantes con rotación paramétrica e ilustraciones vectoriales 3D (Hitos, Cobro 24h, Reputación Base L2, Retorno 27.4% E.A.).
- **`apps/web/src/components/ValueProposition.tsx`:**
  - Modelo dual: Freelancers reciben liquidez inmediata en COP mientras las empresas mantienen su plazo de 30/60 días.
  - Tarjeta de producto en vivo con entregable aprobado, barra de 3 pasos y llamada manuscrita (`Plazo cómodo para la empresa, efectivo hoy para ti ↗`).
- **`apps/web/src/components/BentoCarousel.tsx`:**
  - Track horizontal `01–06 Todo en un solo lugar` con tarjetas interactivas de arquitectura (Adelanto ACH en 2h, Tokens ERC-1155 en Base L2, Algoritmo Mayor Resto, Conciliación 3-Vías).
- **`apps/web/src/components/MobileShowcase.tsx`:**
  - Réplica fiel e interactiva de las **3 pantallas móviles** del diseño de referencia:
    - **Pantalla 1 (Onboarding):** Fondo lavanda con pila de monedas violetas 3D, flecha de crecimiento ascendente, tarjeta blanca inferior con titular "Tu 🔥 Liquidez para Hitos Freelance" y botón píldora "Get Started".
    - **Pantalla 2 (Investment Hub):** Cabecera de usuario con avatar "Premium 🔥 Peter Smith", vórtice de billetes violetas, botón píldora "Explore more investments", pestañas segmentadas `[ Overview | Activity ]` con alternancia de estado reactiva, fila de transacción con `+$500.00` en verde esmeralda y dock flotante con efecto glassmorphism.
    - **Pantalla 3 (Detail & Analytics):** Cabecera con retorno y bookmark interactivo, Bento dual (gráfico de barras con viernes activo en `#7300FF` + tarjeta lavanda con estadísticas), banner promo negro ("Invest Smarter, Not Harder") con botón blanco y lista de transacciones con badges rosa/esmeralda (`-$150.00` / `+$210.50`).
- **`apps/web/src/components/SimulatorSection.tsx`:**
  - Simulador financiero interactivo con sliders de monto ($1M a $25M COP), plazo (15 a 90 días) y selector de Tiers (Semilla, Crecimiento, Consolidado).
  - Cálculo instantáneo de anticipo líquido, comisión de plataforma y retorno para financiadores.
- **`apps/web/src/components/Footer.tsx`:**
  - Tipografía display gigante "PROOFLY" cortada al fondo, navegación por columnas y disclaimer legal regulatorio para Colombia.
- **Verificación Técnica:**
  - `npm --prefix apps/web run build`: compilación limpia con Vite en 520ms (0 errores TypeScript/CSS).
  - `npm test`: 26 pruebas pasando (100%).
  - `npm run test:contracts`: 18 pruebas Foundry pasando (100%).

---

## 2. Mapa de Fases y Estado de Puertas de Aprobación

| Fase / Tanda | Nombre | Estado | Bloqueante / Puerta |
| :--- | :--- | :---: | :--- |
| **Setup & Fuentes** | Rebranding, fuentes de verdad (`DESIGN.md`, `enfoque-proofly.md`, `informe-proyecto.md`) y control vivo | **COMPLETADO** | Ninguno |
| **Fase 1 (1A a 1E)**| Especificación de arquitectura, C4, puertos, HMAC, STRIDE y congelación v1.0 | **COMPLETADO** | **PUERTA 1 CERRADA** |
| **Fase 2** | Fundaciones del Monorepo Turborepo, Docker Compose, Tailwind Tokens | **COMPLETADO** | **Puerta Fase 2 CERRADA** |
| **Fase 3** | Dominio puro, FinancialEngine completo, Casos de Uso y API REST | **COMPLETADO** | **Puerta Fase 3 CERRADA** |
| **Fase 4** | Smart contracts Foundry (`ProoflyKYCRegistry`, `ProoflyOperations` ERC-1155) | **COMPLETADO** | **Puerta Fase 4 CERRADA** |
| **Fase 5** | Integración Backend + Blockchain (`viem`, Outbox worker, Conciliador) | **COMPLETADO** | **Puerta Fase 5 CERRADA** |
| **Fase 6** | Frontend Web & Mobile Light Mode (Landing interactiva + Showcase 3 pantallas) | **COMPLETADO** | **Puerta Fase 6 (Esperando «APROBADO FASE 6»)** |
| **Fase 7** | QA Integral (QA-01 a QA-06), pruebas de carga y seguridad | *Listo para iniciar* | Puerta Fase 7 |
| **Fase 8** | Documentación operativa, Runbooks de producción y Cierre | *En cola* | Lanzamiento Mainnet |

---

## 3. Estado de las 15 Invariantes del Sistema

- [x] **I1. Unidad de cuenta comercial (COP):** Centavos enteros (`bigint`/`uint256`), implementado en `@proofly/domain`.
- [x] **I2. Arquitectura multi-entorno por configuración:** `apps/api/src/config/env.schema.ts` validando `ENV_MODE=sandbox|production`.
- [x] **I3. Privacidad on-chain estricta:** `contracts/src/ProoflyOperations.sol` solo almacena `bytes32` opacos.
- [x] **I4. Claridad jurídica y transparencia de retornos:** Ecuación E.A. implementada y testeada en `FinancialEngine`.
- [x] **I5. Doble financiación bloqueada por diseño:** `AntiDuplicateService` HMAC implementado en `@proofly/domain`.
- [x] **I6. Emisión con respaldo completo:** `mintOperation` en Solidity exige shares == nominalAmountCents.
- [x] **I7. Transferencias restringidas:** `safeTransferFrom` en Solidity valida `kycRegistry.isKycVerified`.
- [x] **I8. Desacoplamiento por Puertos y Adaptadores:** Arquitectura hexagonal en monorepo.
- [x] **I9. Exactitud aritmética:** Algoritmo del Mayor Resto probado en `financial-engine.test.ts` con 0 centavos de error.
- [x] **I10. Cascada de pagos (Waterfall):** `settleOperation` en Solidity y DDL en PostgreSQL.
- [x] **I11. Gobernanza arquitectónica:** Arquitectura v1.0 congelada formalmente.
- [x] **I12. Inclusión y explicabilidad para Freelancers:** `TiersPolicy` en `@proofly/domain`.
- [x] **I13. Financiación por Hitos (Milestones):** Integrado en `@proofly/domain`.
- [x] **I14. Separación de riesgos:** Modelado en esquema y lógica de dominio.
- [x] **I15. Modo Claro Absoluto:** Frontend en blanco puro (`#FFFFFF`), lavanda pastel (`#F8D4FD`), negro puro (`#000000`) y violeta eléctrico (`#7300FF`).

---

## 4. Próxima Acción Inmediata
- Recibir confirmación **«APROBADO FASE 6»** para dar inicio a la **Fase 7: QA Integral (QA-01 a QA-06), pruebas de carga y seguridad**.
