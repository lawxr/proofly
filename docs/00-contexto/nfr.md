# Requisitos No Funcionales Medibles — Proofly (`docs/00-contexto/nfr.md`)

Este documento define los Requisitos No Funcionales (RNF) cuantitativos, medibles y auditables para la plataforma **Proofly**, agrupados por atributos de calidad arquitectónica.

---

## 1. Rendimiento y Latencia

| ID | Parámetro | Métrica Objetivo | Método de Medición / Verificación |
| :--- | :--- | :--- | :--- |
| **RNF-PERF-01** | Tiempo de respuesta de endpoints de consulta | $p95 < 150 \text{ ms}$ y $p99 < 300 \text{ ms}$ bajo carga nominal (100 req/s) | Pruebas de carga con k6 sobre `/api/v1/operations` y `/api/v1/marketplace`. |
| **RNF-PERF-02** | Latencia de simulación financiera (checkout) | $< 50 \text{ ms}$ en backend | Benchmark unitario del `FinancialEngine` en `packages/domain`. |
| **RNF-PERF-03** | Tiempo de carga inicial del Frontend (FCP / LCP) | First Contentful Paint $< 1.2 \text{ s}$<br>Largest Contentful Paint $< 2.0 \text{ s}$ | Auditoría Google Lighthouse y Web Vitals en conexiones móviles 4G. |
| **RNF-PERF-04** | Rendimiento del Worker de Outbox | Procesamiento de eventos en cola en $< 2 \text{ s}$ tras confirmación en BD | Métrica en Prometheus `outbox_event_latency_seconds`. |

---

## 2. Precisión Aritmética e Integridad Financiera

| ID | Parámetro | Métrica Objetivo | Método de Medición / Verificación |
| :--- | :--- | :--- | :--- |
| **RNF-ARITH-01** | Desviación por redondeo en distribución de fondos | **$0 \text{ centavos}$ de error** ($\sum \text{partes} \equiv \text{recaudo}$) | Property-based testing con `fast-check` y Foundry fuzzing (10.000 iteraciones). |
| **RNF-ARITH-02** | Precisión de representación monetaria | Enteros sin signo (`bigint` en TS, `uint256` en Solidity) representando centavos de COP | Prohibición estricta de `number` en montos monetarios en TypeScript (`no-floating-promises` + linter custom). |
| **RNF-ARITH-03** | Conciliación Off-Chain vs. On-Chain | Cero discrepancias en balances de participaciones al cierre diario | Job automatizado de conciliación que compara balances en PostgreSQL vs. eventos indexados de Base. |

---

## 3. Resiliencia y Disponibilidad

| ID | Parámetro | Métrica Objetivo | Método de Medición / Verificación |
| :--- | :--- | :--- | :--- |
| **RNF-AVAIL-01** | Disponibilidad de la API | $\ge 99.9 \%$ mensual (máx 43 min de inactividad no planificada) | Monitorización continua con Uptime Kuma / Datadog. |
| **RNF-RESIL-01** | Tolerancia a fallos de RPC Web3 | Reintento automático con *exponential backoff* y failover secundario | El `ChainGatewayPort` debe contar con al menos 2 proveedores RPC (ej. Alchemy + Infura). |
| **RNF-RESIL-02** | Tolerancia a reorganizaciones de cadena (*reorgs*) | Espera de 12 confirmaciones de bloque en Base antes de considerar una tx final | Pruebas de integración simulando bifurcaciones de red en Anvil. |

---

## 4. Seguridad y Cumplimiento Normativo

| ID | Parámetro | Métrica Objetivo | Método de Medición / Verificación |
| :--- | :--- | :--- | :--- |
| **RNF-SEC-01** | Generación de clave anti-duplicado | HMAC-SHA256 con secreto de servidor seguro rotativo | Pruebas de unicidad sobre facturas e hitos con el mismo contenido y distinta clave secreta. |
| **RNF-SEC-02** | Cero PII en Blockchain | $0 \text{ bytes}$ de nombres, correos, documentos de identidad o textos contractuales en Base | Script de inspección estática de contratos y payloads de transacciones. |
| **RNF-SEC-03** | Protección contra ataques de fuerza bruta | Rate-limiting de 10 intentos por minuto en endpoints de autenticación y confirmación | Middleware de throttling en NestJS con Redis. |
| **RNF-SEC-04** | Cifrado en tránsito y en reposo | TLS 1.3 con HSTS en tránsito; AES-256 en PostgreSQL | Configuración de servidor web y volúmenes cifrados en Docker Compose / AWS RDS. |

---

## 5. Portabilidad y Multi-Entorno

| ID | Parámetro | Métrica Objetivo | Método de Medición / Verificación |
| :--- | :--- | :--- | :--- |
| **RNF-PORT-01** | Conmutación Sandbox a Producción | $< 5 \text{ segundos}$ cambiando variables de entorno (`ENV_MODE=production`), sin recompilar | Prueba de validación de arranque del servicio con Zod Schema en `apps/api`. |
| **RNF-PORT-02** | Tiempo de despliegue local de entorno completo | $< 3 \text{ minutos}$ ejecutando `docker compose up` en máquina limpia | Validación del pipeline local con base de datos, worker y nodo Anvil. |

---

## 6. Usabilidad y Accesibilidad Visual (Light Mode)

| ID | Parámetro | Métrica Objetivo | Método de Medición / Verificación |
| :--- | :--- | :--- | :--- |
| **RNF-UI-01** | Contraste tipográfico (WCAG 2.1 AA) | Ratio de contraste $\ge 4.5:1$ para texto regular y $\ge 3:1$ para encabezados grandes | Verificación automatizada con Axe DevTools sobre todas las vistas. |
| **RNF-UI-02** | Adaptabilidad a pantallas móviles | $0 \text{ desbordamientos}$ horizontales (*horizontal scroll*) en anchos de 320px, 390px y 430px | Pruebas automatizadas con Playwright en mobile viewports. |

