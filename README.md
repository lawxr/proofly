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

## 4. Ejecución Local y Pruebas

Requiere Node.js 22 o superior y las dependencias del monorepo instaladas (`npm install`). La entrada principal es la landing React y la app violeta mobile-first de `apps/web`; la interfaz azul anterior no se sirve.

```sh
# Ejecutar servidor local (landing + acceso por PIN + app)
npm run dev
# http://127.0.0.1:3000

# Suite de pruebas unitarias y de dominio
npm test

# Verificación de sintaxis de scripts
npm run check

# Prueba de interfaz end-to-end (Playwright)
npm run test:browser
```

### Usuario unificado

Proofly opera con una sola identidad por persona. El mismo usuario puede **financiarse** (adelantar el cobro de sus facturas e hitos) e **invertir** (fondear operaciones de otros y recibir retornos). La app presenta un único perfil con dos saldos claramente separados —cupo disponible para adelantos y capital invertido— y un selector de intención (Financiarme / Invertir) que cambia el enfoque sin cambiar de identidad. Una persona no puede invertir en su propia operación.

## 5. Conexión Blockchain (Base / EVM)

La integración on-chain arranca sobre **Anvil local** (red EVM determinista, chain-id `84532`) y se mueve a **Base Sepolia** y luego **Base Mainnet** cambiando solo variables de entorno.

Contratos en `contracts/` (Foundry): `ProoflyKYCRegistry` y `ProoflyOperations` (ERC-1155). El adaptador real vive en `apps/api/src/adapters/blockchain/` y usa `viem`. Una fábrica selecciona el adaptador real o el mock según `BLOCKCHAIN_ADAPTER`; el valor por defecto es `mock`, de modo que el resto del sistema no cambia hasta pedir la conexión real.

```sh
# 1. Levantar la cadena local
anvil --host 127.0.0.1 --port 8545 --chain-id 84532

# 2. Desplegar los contratos
cd contracts && forge script script/Deploy.s.sol:DeployProofly \
  --rpc-url http://127.0.0.1:8545 --broadcast

# 3. Cargar el entorno local (ver .env.anvil) y verificar la conexión real
set -a; source .env.anvil; set +a
node --experimental-strip-types scripts/verify-chain.mjs
BLOCKCHAIN_ADAPTER=viem node --experimental-strip-types scripts/verify-worker-chain.mjs
```

`scripts/verify-chain.mjs` ejercita mint y liquidación reales contra el contrato desplegado; `scripts/verify-worker-chain.mjs` comprueba el flujo worker → outbox → cadena. El archivo `.env.anvil` usa la clave pública de desarrollo de Anvil y se mantiene fuera de git.

> Estado de la integración: la primera capa (adaptador blockchain real sobre Anvil, seleccionado por entorno y cableado al worker) está funcionando y verificada. Siguen pendientes el outbox compartido en Postgres entre API y worker, el driver de persistencia real, el enriquecimiento del payload de financiadores, y el salto a Base Sepolia. Los proveedores externos (DIAN/RADIAN, KYC, pasarela de pago, correo) permanecen simulados mediante adaptadores deterministas.

---

## 6. Acceso Privado: landing → PIN → app

Producto privado en desarrollo. `npm run dev` compila la landing React y sirve un único recorrido local:

- `/`: landing pública; sus botones de entrada llevan a `/login`.
- `/login`: acceso por PIN, validado en el servidor.
- `/app/`: app violeta mobile-first con Inicio, Operaciones, Mercado, Portafolio y Actividad.

En el primer inicio local se genera un PIN de 4 dígitos en `.env.demo`, ignorado por Git y con permisos de archivo restringidos. No lo publiques ni lo añadas al frontend. Puedes sustituirlo por un PIN de exactamente 4 dígitos y reiniciar el servidor, o definir `DEMO_ACCESS_PIN` en el entorno.

La sesión dura ocho horas y se guarda en una cookie HttpOnly, no en localStorage. Cinco intentos incorrectos bloquean nuevos intentos desde esa conexión durante quince minutos. `Salir` revoca la sesión; reiniciar el servidor revoca todas.

Para una instancia HTTPS, configura `NODE_ENV=production` y un PIN explícito; las cookies serán Secure. Si hay un proxy TLS con otro modo de ejecución, configura `DEMO_SECURE_COOKIE=true`. El servidor no confía en cabeceras de IP reenviadas: visitantes detrás del mismo proxy comparten el límite de intentos. Este gate es para una instancia privada única: no sustituye identidad individual, autorización financiera, KYC ni autenticación de producción.

Pruebas del acceso y del dominio: `node --experimental-strip-types --test tests/demo-server.test.mjs tests/private-app.test.mjs`. `npm run test:browser` levanta una instancia aislada con PIN temporal y recorre el flujo completo de usuario unificado (financiarse e invertir) en cinco vistas responsive.

### Lógica reutilizada

El adaptador `scripts/private-app.mjs` llama a los casos de uso canónicos de `packages/domain`: cotización con comisión, creación de facturas e hitos, confirmación del pagador, aceptación explícita, participaciones, liquidación y cupos por nivel. La verificación DIAN, el KYC, las firmas y los pagos se resuelven hoy con adaptadores deterministas mientras se integran los proveedores reales. El estado de operaciones vive en el proceso del servidor y se restablece al reiniciarlo.

## 7. Estado de Avance

Consulta el seguimiento vivo del trabajo en `odd/tasks/` (usuario unificado y conexión blockchain), y el control de arquitectura en `docs/STATUS.md` y `docs/OPEN_QUESTIONS.md`.
