# Enfoque de Producto Vigente — Proofly

Este documento establece la definición y el enfoque de producto vigente de **Proofly**, reemplazando cualquier concepción previa y sirviendo como fuente de verdad del modelo de negocio.

---

## Definición del Producto

| Aspecto | Definición en Proofly |
| :--- | :--- |
| **Nombre del Producto** | **Proofly** |
| **Propósito Dual** | 1) Que **cualquier freelancer** o independiente pueda financiarse dentro de la App adelantando facturas o contratos por hitos.<br>2) Que **los financiadores ganen dinero** fondeando estas operaciones a cambio de un descuento comercial / tasa de retorno transparente. |
| **Usuarios Principales** | **Freelancers** (buscan liquidez inmediata por su trabajo), **Financiadores** (aportan capital para obtener retornos al vencimiento) y **Empresas Contratantes** (confirman el proyecto/factura y realizan el pago final al recaudo). |
| **Activos Financiables** | Facturas electrónicas emitidas y contratos/órdenes de trabajo verificables divididos por tramos o hitos (*milestones*). |
| **Motor de Elegibilidad** | Basado en la reputación verificable del freelancer (historial de entrega, portafolio conectado, contratos previos) y la reputación de pago de la empresa contratante. Permite que cualquier freelancer legítimo acceda a un cupo inicial progresivo (Nivel Semilla / Tiers). |
| **Modelo de Ganancia (Financiadores)** | El freelancer solicita liquidez con una tasa de descuento clara sobre el valor nominal del hito o factura. Cuando la empresa contratante paga el 100 % en la cuenta de recaudo, el protocolo liquida automáticamente el capital + la ganancia neta a los financiadores y retiene el fee operativo de Proofly. |
| **Despliegue y Red** | Arquitectura agnóstica de entorno: se prueba en **Base Sepolia** y pasa a **Base Mainnet** cambiando únicamente variables de entorno (`RPC_URL`, `CHAIN_ID`, direcciones de contratos y adaptadores de pago/verificación). |
| **Interfaz (UI/UX)** | **100 % Modo Claro** (`#FFFFFF`, `#F8D4FD`, `#000000`, `#7300FF`), mobile-first, abstrayendo la complejidad cripto para que el usuario opere en pesos (COP) con experiencia de neobank. |

---

## Diferencias Clave Frente al Modelo Previo (Factoken)

1. **Enfoque Exclusivo en Freelancers e Independientes:**
   - No limitado a corporaciones o factoring de grandes pagadores.
   - Soporte nativo para contratos por hitos (*milestone-based contracts*) antes de la emisión de la factura final.
   - Sistema de reputación progresiva y niveles de cupo (Tiers) que permite a freelancers nuevos obtener liquidez desde su primer contrato verificado.

2. **Doble Propuesta de Valor y Retornos Claros:**
   - **Para el Freelancer:** Adelanto inmediato de sus ingresos en COP, sin endeudamiento tradicional ni trámites bancarios lentos.
   - **Para el Financiador:** Marketplace transparente con cálculo exacto de retorno en COP y Tasa Efectiva Anual (E.A.), con separación clara entre riesgo de cumplimiento del freelancer y riesgo de solvencia de la empresa contratante.

3. **Arquitectura para Producción:**
   - Despliegue modular en monorepo Turborepo (NestJS + TypeScript + PostgreSQL + Foundry / Solidity ERC-1155 sobre Base).
   - Conmutación limpia Sandbox / Producción gobernada por variables de entorno sin modificar código.
   - Abstracción completa de wallets (Web2 UX) y cumplimiento estricto de privacidad off-chain.

