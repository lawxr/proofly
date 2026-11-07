# Análisis de Capacidad y Dimensionamiento — Proofly (`docs/architecture/21-capacity.md`)

Este documento presenta el análisis de dimensionamiento de infraestructura, capacidad transaccional y proyección de costos de computación y red para **Proofly**.

---

## 1. Proyección de Volumen Operativo (Año 1 a Año 3)

| Métrica de Negocio | Año 1 | Año 2 | Año 3 |
| :--- | :---: | :---: | :---: |
| **Operaciones Originadas por Año** | 5.000 | 25.000 | 100.000 |
| **Volumen Total Financiado (COP)** | $ 15.000M COP | $ 85.000M COP | $ 400.000M COP |
| **Financiadores Activos** | 500 | 3.000 | 15.000 |
| **Freelancers Activos** | 1.200 | 6.500 | 30.000 |
| **Transacciones On-Chain Anuales** | ~10.000 tx | ~50.000 tx | ~200.000 tx |
| **Pico Diario (Cierres de Mes)** | 100 ops / día | 500 ops / día | 2.000 ops / día |

---

## 2. Capacidad y Costos en la Red Base (L2 EVM)

Base es un *Optimistic Rollup* construido sobre el OP Stack de Ethereum, ofreciendo tiempos de bloque de 2 segundos y costos de gas ultra-reducidos gracias a los *blobs* de datos de EIP-4844:

| Operación Smart Contract | Consumo Típico de Gas | Costo Estimado en Base (ETH = $ 3.000 USD) | Costo en Pesos Colombianos (COP) |
| :--- | :---: | :---: | :---: |
| `ProoflyKYCRegistry.setKycStatus` | ~45.000 gas | $0.001 USD | ~$ 4.20 COP |
| `ProoflyOperations.mintOperation` | ~135.000 gas | $0.004 USD | ~$ 16.80 COP |
| `ProoflyOperations.settleOperation`| ~75.000 gas | $0.002 USD | ~$ 8.40 COP |
| **Costo Total Blockchain por Operación** | **~255.000 gas** | **$0.007 USD** | **~$ 29.40 COP** |

*Conclusión:* El costo del gas en Base representa menos del **0.002 %** del valor nominal promedio de una operación ($ 3.000.000 COP), haciendo viable el subsidio total del gas por parte de Proofly para una experiencia Web2 sin fricción.

---

## 3. Dimensionamiento de Almacenamiento e Infraestructura Backend

### 3.1. Base de Datos Relacional (PostgreSQL 16)
* **Tamaño por Operación Completa:** ~8 KB (incluyendo registros de usuario, detalle de factura/hito, participaciones, outbox y eventos indexados).
* **Volumen Año 1 (5.000 operaciones):** $< 500 \text{ MB}$ de datos puros; con índices y logs de auditoría: $\approx 5 \text{ GB}$.
* **Estrategia de Mantenimiento:** Limpieza periódica (*archival*) de la tabla `outbox_events` para eventos en estado `COMPLETED` con más de 90 días de antigüedad.

### 3.2. Servidores de Aplicación (API Core y Workers)
* **Instancias Recomendadas (Año 1):** 2 réplicas de `apps/api` (2 vCPU, 4 GB RAM) detrás de un Application Load Balancer (ALB).
* **Worker de Outbox:** 1 réplica dedicada (1 vCPU, 2 GB RAM) con auto-escalado horizontal basado en `proofly_outbox_queue_depth`.
* **Capacidad Nominal Soportada:** $> 500 \text{ req/s}$, lo que otorga un margen de holgura de más de 20x frente a los picos proyectados para el primer año.

