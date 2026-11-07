# ADR-0004: Patrón Transactional Outbox y Worker Asíncrono de Sincronización Blockchain

* **Estado:** Aprobado
* **Fecha:** 2026-11-07
* **Contexto Técnico:** Resiliencia de Transacciones y Consistencia Eventual On-Chain

---

## Contexto y Planteamiento del Problema
Al interactuar con redes blockchain como Base (L2 EVM), los envíos directos y síncronos desde los controladores HTTP de la API presentan serios riesgos: tiempos de respuesta impredecibles por congestión de gas, fallos de RPC, caída de nodos y problemas de consistencia dual (*dual-write problem*) si la base de datos confirma pero la transacción blockchain revierte o viceversa.

## Opciones Consideradas
1. **Llamadas síncronas directas Web3 desde los endpoints de la API.**
2. **Cola de mensajería externa pesada (ej. Apache Kafka / RabbitMQ) coordinada con la BD.**
3. **Patrón Transactional Outbox en PostgreSQL con Worker Asíncrono desacoplado (Recomendada).**

## Decisión Tomada
Se elige la **Opción 3: Transactional Outbox en PostgreSQL**.
- Las mutaciones de estado que requieran minteo on-chain o liquidación insertan un registro en la tabla `outbox_events` dentro de la misma transacción ACID de PostgreSQL.
- Un worker dedicado (`apps/worker`) realiza polling concurrente seguro (`FOR UPDATE SKIP LOCKED`), envía la transacción a Base utilizando `viem`, espera 12 confirmaciones de bloque y marca el evento como completado con el `tx_hash`.

## Consecuencias
* **Positivas:**
  * Cero discrepancias por caídas a mitad de transacción.
  * APIs de usuario responden en milisegundos sin esperar confirmaciones de bloques en la red.
  * Reintentos automáticos con retroceso exponencial (*exponential backoff*) e idempotencia estricta.
* **Negativas:**
  * Consistencia eventual en el frontend: la UI debe reflejar transitoriamente el estado "en proceso de confirmación" hasta que el worker notifique la finalización.

