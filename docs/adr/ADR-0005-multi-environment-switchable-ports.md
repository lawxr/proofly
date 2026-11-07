# ADR-0005: Puertos Conmutables Multi-Entorno (Sandbox vs. Producción)

* **Estado:** Aprobado
* **Fecha:** 2026-11-07
* **Contexto Técnico:** Conmutabilidad de Infraestructura y Despliegue Multi-Red

---

## Contexto y Planteamiento del Problema
De acuerdo con la **Invariante I2**, está terminantemente prohibido quemar direcciones, claves o lógicas exclusivas de prueba en el código de Proofly. La arquitectura debe estar lista para producción, de modo que cambiar entre el entorno de pruebas (**Sandbox** con Base Sepolia y mocks de DIAN/KYC/Bancos) y el entorno real (**Producción** con Base Mainnet, RADIAN y pasarelas bancarias reales) dependa exclusivamente de variables de entorno validadas al inicio del servicio, sin alterar ni recompilar el código.

## Opciones Consideradas
1. **Bifurcación de código por ramas de Git (`feature/sandbox` vs `main`).**
2. **Sentencias condicionales `if (isDev)` dispersas por toda la base de código.**
3. **Inyección de Dependencias por Puertos y Adaptadores gobernada por variables de entorno (Recomendada).**

## Decisión Tomada
Se elige la **Opción 3**:
- El dominio define contratos de interfaz puros (`Ports`): `InvoiceVerificationPort`, `MilestoneConfirmationPort`, `KycPort`, `ReputationScoringPort`, `PaymentRailPort`, `ChainGatewayPort`.
- La capa de infraestructura provee dos implementaciones por puerto: un adaptador *Sandbox* (con respuestas deterministas y emulación de fallos para testing) y un adaptador de *Producción* (con conexiones reales a APIs externas y Web3).
- El contenedor de inyección de NestJS resuelve el adaptador activo según la variable tipada `ENV_MODE=sandbox|production` validada en el arranque mediante un esquema Zod.

## Consecuencias
* **Positivas:**
  * Paso de pruebas a producción instantáneo y seguro mediante configuración de variables de entorno.
  * Pruebas E2E locales reproducibles al 100 % sin depender de disponibilidad de APIs externas de terceros.
  * Cumplimiento total de la Invariante I2.
* **Negativas:**
  * Exige desarrollar y mantener adaptadores mock deterministas para cada integración externa.

