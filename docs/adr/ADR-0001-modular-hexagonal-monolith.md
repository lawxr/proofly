# ADR-0001: Adopción de Monolito Modular Hexagonal en Monorepo Turborepo

* **Estado:** Aprobado
* **Fecha:** 2026-11-07
* **Contexto Técnico:** Arquitectura de Sistema y Separación de Responsabilidades

---

## Contexto y Planteamiento del Problema
Proofly requiere coordinar procesos financieros de alta integridad (originación, validación documental, cotización, fondeo en marketplace, desembolsos y recaudo) con un ledger descentralizado en Base. Una arquitectura de microservicios distribuidos en esta etapa temprana introduce sobrecarga de red, latencia, complejidad en transacciones distribuidas y mantenimiento costoso de infraestructura. Al mismo tiempo, una arquitectura en capas tradicional (*layered architecture*) acopla la lógica de negocio a frameworks específicos y bases de datos.

## Opciones Consideradas
1. **Microservicios independientes:** Servicios separados por Bounded Context (Auth, Originación, Marketplace, Settlement).
2. **Monolito tradicional en capas:** Arquitectura MVC clásica con dependencias directas a base de datos y librerías externas.
3. **Monolito Modular Hexagonal con Monorepo Turborepo (Recomendada):** Código organizado en paquetes tipados (`packages/domain`, `packages/contracts-sdk`) y aplicaciones (`apps/api`, `apps/worker`, `apps/web`), donde el dominio es TypeScript puro desacoplado mediante Puertos y Adaptadores.

## Decisión Tomada
Se elige la **Opción 3: Monolito Modular Hexagonal en Turborepo**. El núcleo de negocio reside en `packages/domain` sin dependencias de NestJS, Drizzle o viem. La aplicación `apps/api` expone la interfaz REST, mientras que `apps/worker` procesa tareas asíncronas de blockchain e indexación.

## Consecuencias
* **Positivas:**
  * Transacciones ACID locales entre entidades operativas sin necesidad de sagas complejas.
  * Dominio financiero 100 % testeable con pruebas unitarias ultra-rápidas.
  * Compartición de tipos TypeScript entre frontend, backend y contratos inteligentes sin duplicación.
* **Negativas:**
  * Requiere disciplina estricta de límites entre módulos para evitar dependencias circulares.

