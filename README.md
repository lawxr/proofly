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

## 6. Autenticación y Persistencia

`npm run dev` compila la landing React y sirve el recorrido completo:

- `/`: landing pública; sus botones de entrada llevan a `/login`.
- `/login`: registro (`/api/auth/signup`) e inicio de sesión (`/api/auth/login`) reales.
- `/app/`: app violeta mobile-first con Inicio, Operaciones, Mercado, Portafolio y Actividad.

### Cuentas reales

El registro crea un usuario con correo, documento y contraseña. Las contraseñas se almacenan con **scrypt** (sal aleatoria, nunca en texto plano). El inicio de sesión verifica la contraseña contra el hash almacenado. La sesión dura ocho horas en una cookie HttpOnly `proofly_session` (SameSite=Strict), nunca en localStorage; `Salir` la revoca. El registro y el login exigen mismo origen y aplican un límite de intentos por conexión.

La verificación de identidad (KYC) pasa hoy por un adaptador determinista; sustituirlo por un proveedor real (p. ej. Truora) es un cambio de adaptador, no de la lógica.

### Persistencia conmutable

Por defecto el estado vive en memoria (desarrollo). Con `PERSISTENCE=postgres` y `DATABASE_URL`, los repositorios usan PostgreSQL vía el driver `pg`, y los usuarios registrados sobreviven a reinicios.

```sh
docker compose up -d postgres          # levanta Postgres con db/schema.sql
PERSISTENCE=postgres npm run dev        # arranca con persistencia real

# Verificaciones end-to-end contra la base:
node --experimental-strip-types scripts/verify-postgres.mjs       # round-trip de repos
node --experimental-strip-types scripts/verify-auth-postgres.mjs  # signup real persistido
```

El esquema (`db/schema.sql`) está reconciliado con el dominio y los repositorios; el init de Docker solo corre sobre un volumen limpio, así que tras cambiarlo hay que recrear la base con `docker compose down -v`.

Para HTTPS, configura `NODE_ENV=production` (cookies `Secure`) o `PROOFLY_SECURE_COOKIE=true` tras un proxy TLS.

Pruebas: `node --experimental-strip-types --test tests/demo-server.test.mjs tests/private-app.test.mjs`. `npm run test:browser` levanta una instancia aislada, registra una cuenta real y recorre el flujo de usuario unificado (invertir y anticipar) en cinco vistas responsive.

## 7. Estado de Avance

Seguimiento vivo del trabajo en `odd/tasks/` (usuario unificado, conexión blockchain, persistencia y auth). Control de arquitectura en `docs/STATUS.md` y `docs/OPEN_QUESTIONS.md`.
