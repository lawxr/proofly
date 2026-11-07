# Proofly

> **Liquidez para Freelancers. Retornos para Financiadores.**  
> Plataforma fintech apoyada en blockchain (Base / EVM) donde cualquier profesional independiente puede anticipar el cobro de sus facturas o contratos por hitos (*milestones*), y donde los financiadores obtienen retornos atractivos y predecibles al aportar liquidez.

---

## 1. Visión General del Producto

Proofly atiende una necesidad crítica del mercado independiente y creativo:
- **Para Freelancers:** Acceso a liquidez inmediata en pesos colombianos (COP) sobre entregables aprobados y facturas, sin endeudamiento tradicional ni demoras de pago de 30 a 90 días.
- **Para Financiadores:** Acceso a un marketplace de operaciones con rendimientos transparentes en COP y Tasa Efectiva Anual (E.A.) calculada al instante, respaldada por la cesión legal de derechos económicos.
- **Evaluación de Riesgo Separada:** Score de Ejecución del Freelancer (reputación y entregas previas) y Score de Solvencia de la Empresa Contratante (capacidad de pago).
- **Onboarding Progresivo:** Sistema de niveles de cupo (Tiers) que permite a cualquier freelancer legítimo iniciar con un cupo semilla e incrementarlo con cada operación liquidada.

---

## 2. Sistema de Diseño (`Modo Claro Absoluto`)

Proofly opera **exclusivamente en Modo Claro (Light Mode Only)**, priorizando limpieza visual, alta legibilidad y estética mobile neobank:
- **Canvas / Fondo:** `#FFFFFF` (Blanco puro).
- **Superficie Secundaria / Tarjetas Bento:** `#F8D4FD` (Lavanda / Rosa pastel).
- **Superficie Neutra:** `#F6F5F8` (Gris lavanda claro para inputs y selectores).
- **Acento Primario / Marca:** `#7300FF` (Violeta eléctrico para barras activas, badges y progreso).
- **Contraste / Botones Primarios:** `#000000` (Píldoras redondeadas con tipografía blanca de alto impacto).
- **Retornos Positivos:** `#16A34A` (Verde esmeralda para ganancias de financiadores).

Consulta la especificación completa en [`docs/fuentes/DESIGN.md`](docs/fuentes/DESIGN.md).

---

## 3. Arquitectura y Fuentes de Verdad

El diseño de ingeniería está preparado para operar en producción mediante conmutación de entornos sin reescribir código:
- **Sandbox:** Base Sepolia + adaptadores mock deterministas para desarrollo.
- **Producción:** Base Mainnet + proveedores reales de KYC, pasarelas de pago y validación de facturación.

### Fuentes de Verdad (`docs/fuentes/`)
- [`docs/fuentes/DESIGN.md`](docs/fuentes/DESIGN.md): Sistema de diseño visual, componentes móviles y landing page interactiva.
- [`docs/fuentes/enfoque-proofly.md`](docs/fuentes/enfoque-proofly.md): Enfoque de negocio vigente, modelo dual y activos financiables.
- [`docs/fuentes/informe-proyecto.md`](docs/fuentes/informe-proyecto.md): Marco jurídico colombiano (Ley 1231, Decreto 1154, RADIAN, Ley 1581 de protección de datos), modelo operativo y riesgos.

### Control de Arquitectura Vivo
- [`docs/STATUS.md`](docs/STATUS.md): Estado de avance y validación de las 15 invariantes.
- [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md): Registro y solución de los 12 puntos críticos de arquitectura.
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md): Glosario técnico y financiero unificado.
- [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md): Supuestos arquitectónicos y regulatorios.
- [`CLAUDE.md`](CLAUDE.md): Prompt maestro permanente e invariantes innegociables.

---

## 4. Prototipo Local y Pruebas

Requiere Node.js 22 o superior. No requiere instalación de paquetes adicionales (`zero-dependency`).

```sh
# Ejecutar servidor de desarrollo local
npm run dev
# http://127.0.0.1:3000

# Ejecutar suite de pruebas unitarias y de dominio
npm test

# Verificación de sintaxis de scripts
npm run check
```

---

## 5. Próximos Pasos (Fase 1: Tandas 1A a 1E)

1. **Tanda 1A:** Requisitos detallados, flujos de usuario y procesos en Mermaid (`docs/00-contexto/`).
2. **Tanda 1B:** Arquitectura hexagonal, motor financiero (`FinancialEngine`) y máquina de estados.
3. **Tanda 1C:** Esquema PostgreSQL, contratos inteligentes (`ProoflyOperations` ERC-1155) y OpenAPI 3.1.
4. **Tanda 1D:** Seguridad STRIDE, privacidad (Ley 1581) y pipeline multi-red.
5. **Tanda 1E:** Revisión adversarial y plan de construcción definitivo (**Puerta 1**).
