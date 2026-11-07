# Documentación de Proofly

Bienvenido al repositorio de documentación técnica, financiera, jurídica y de arquitectura de **Proofly**: la plataforma fintech que brinda liquidez inmediata a trabajadores independientes y freelancers mediante el descuento de facturas e hitos contractuales, y retornos transparentes a financiadores mediante contratos inteligentes en Base (EVM).

---

## 1. Fuentes de Verdad (`docs/fuentes/`)

Estas fuentes constituyen la base inmutable de diseño y negocio del proyecto:

| Documento | Propósito |
| :--- | :--- |
| [**DESIGN.md**](fuentes/DESIGN.md) | **CÓMO se ve y se comporta:** Sistema visual Modo Claro Absoluto (`#FFFFFF`, `#F8D4FD`, `#000000`, `#7300FF`), estética mobile fintech, componentes Bento y especificación de landing interactiva. |
| [**enfoque-proofly.md**](fuentes/enfoque-proofly.md) | **ENFOQUE VIGENTE:** Modelo de negocio dual (liquidez a freelancers y ganancia neta a financiadores), originación abierta por Tiers, hitos y facturas, y despliegue multi-red (Base Sepolia / Base Mainnet). |
| [**informe-proyecto.md**](fuentes/informe-proyecto.md) | **QUÉ y POR QUÉ:** Marco jurídico colombiano (Ley 1231, Decreto 1154, RADIAN, cesión de derechos), análisis de riesgos, modelo operativo y viabilidad financiera. |

---

## 2. Archivos de Control Vivos

Documentos vivos que se actualizan continuamente en cada fase de desarrollo:

- [**STATUS.md**](STATUS.md): Estado general del proyecto, mapa de fases y verificación de las 15 invariantes.
- [**OPEN_QUESTIONS.md**](OPEN_QUESTIONS.md): Registro de los 12 puntos críticos de arquitectura y decisiones de diseño pendientes.
- [**GLOSSARY.md**](GLOSSARY.md): Glosario ubicuo de términos financieros, jurídicos, técnicos y de producto.
- [**ASSUMPTIONS.md**](ASSUMPTIONS.md): Supuestos explícitos bajo los cuales opera la arquitectura.

---

## 3. Hoja de Ruta de Arquitectura (Fase 1: Tandas 1A a 1E)

La fase de especificación y diseño detallado se ejecuta en 5 tandas consecutivas con puertas de aprobación:

* **Tanda 1A:** Descubrimiento, requisitos funcionales/no funcionales, onboarding de freelancers y modelo de ganancias (`docs/00-contexto/`).
* **Tanda 1B:** Arquitectura hexagonal, motor financiero (`FinancialEngine`), máquina de estados unificada y reputación dual (`docs/architecture/`).
* **Tanda 1C:** Modelo de datos PostgreSQL, contratos Solidity (`ProoflyOperations`), especificación OpenAPI y reconciliación.
* **Tanda 1D:** Seguridad (STRIDE), cumplimiento normativo (Ley 1581), estrategia de calidad y pipeline multi-red.
* **Tanda 1E:** Revisión adversarial (15 escenarios críticos), congelación v1.0 y plan de construcción Fases 2 a 8 (**Puerta 1**).

---

## 4. Guías Adicionales

- [**ui-design.md**](ui-design.md): Guía de diseño de interfaz compacta y mobile-first con tokens de color Proofly.
- [**CLAUDE.md**](../CLAUDE.md): Instrucciones permanentes del arquitecto, invariantes y principios de ingeniería.
