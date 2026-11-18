# Despliegue de Proofly (MVP en Ethereum Sepolia)

## Qué hay que desplegar

| Pieza | Para qué | ¿Puede dormirse? |
|---|---|---|
| **Servicio web** (`npm start`) | App y API en una URL pública | Sí, aunque la primera visita tarda |
| **Worker** (`npm run start:worker`) | Abre facturas on-chain, liquida y habilita wallets nuevas | **No.** Si se duerme, nadie puede invertir ni liquidar |
| **PostgreSQL** | Usuarios, facturas, inversiones, outbox | **No debe borrarse** |

Los contratos ya están en Sepolia y no se vuelven a desplegar.

## Render vs Railway

| | Render | Railway |
|---|---|---|
| Servicio web gratis | Sí, pero se apaga a los 15 min sin visitas y tarda cerca de 1 min en volver ([docs](https://render.com/docs/free)) | No hay plan gratis permanente útil; solo un crédito de prueba |
| Worker en segundo plano | **No tiene plan gratis**; solo web, Postgres y Key Value lo tienen ([docs](https://render.com/docs/free)) | Sí, como un servicio más |
| Postgres gratis | Sí, pero **se borra a los 30 días** ([docs](https://render.com/docs/free)) | Incluido en el uso; no expira |
| Cómo cobra | Precio fijo por instancia + plan de workspace | Por uso real de CPU y memoria ([docs](https://docs.railway.com/pricing)) |
| Costo para este MVP | Gratis no alcanza (falta el worker y la base expira). Con planes pagos: un plan por servicio más la base | **Hobby: US$5/mes**, que incluye US$5 de uso ([docs](https://docs.railway.com/pricing/plans)) |

**Para mostrarle la app al profesor (gratis): Render + Neon con el worker dentro del servicio web** (sección siguiente).
**Para que quede siempre encendida: Railway.** Este MVP necesita un worker siempre encendido y una base que no se borre, y eso en Render no es gratis. Con poco tráfico (unas 5 personas a la vez), web + worker + Postgres deberían quedar cerca de los US$5 del plan Hobby. Es una estimación: revise el consumo en el panel la primera semana.

Si ya tienen créditos en Render, también funciona: web (plan gratis o pago) + worker (pago) + Postgres (pago, porque el gratis expira a los 30 días).

---

## Opción gratis: Render (web + worker en un servicio) + Neon (Postgres)

Esta opción no cuesta nada y alcanza para mostrarle la app al profesor.
- **Un solo servicio web gratis en Render** que también corre el worker (`RUN_WORKER=true`). Cuando nadie lo usa se duerme; al abrir el link tarda cerca de 1 minuto en despertar, y el worker despierta con él. Los eventos pendientes quedan en la base y se procesan al despertar.
- **La base en Neon** (neon.tech, plan gratis). La base gratis de Render se borra a los 30 días; la de Neon no.
- Costo del ajuste: la clave del operador queda en el servicio web. Es aceptable en Sepolia, no en producción.

### Paso a paso
1. **Neon:** cree un proyecto → copie la *connection string* (`postgresql://…neon.tech/neondb?sslmode=require`).
2. **Render:** New → **Web Service** → conecte el repositorio de GitHub → rama `main` → plan **Free**.
   - Build command: `npm ci --include=dev && npm run build`
   - Start command: `npm start`
3. **Variables de entorno** en Render:
```
NODE_ENV=production
RUN_WORKER=true
PERSISTENCE=postgres
DATABASE_URL=<la de Neon>
DATABASE_SSL=true
SERVER_HMAC_SECRET=<cadena aleatoria de 48+ caracteres>
OPERATOR_PRIVATE_KEY=<la de su .env.local>
BLOCKCHAIN_ADAPTER=viem
CHAIN_ID=11155111
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PROOFLY_OPERATIONS_ADDRESS=0xdA03f2AfBeB77a47843466252e04d7dA284DaBA3
PROOFLY_KYC_REGISTRY_ADDRESS=0x407B83F792895E2d88B8b96e1A640b0Fa3A2De11
MOCK_USDC_ADDRESS=0x776991CA67ec0DAb8907FD84d08143BcA2050C0b
DEMO_COP_PER_USDC=4000
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_PROOFLY_OPERATIONS_ADDRESS=0xdA03f2AfBeB77a47843466252e04d7dA284DaBA3
VITE_MOCK_USDC_ADDRESS=0x776991CA67ec0DAb8907FD84d08143BcA2050C0b
DEMO_ONBOARD_MUSDC=1000
DEMO_ONBOARD_ETH_WEI=10000000000000000
```
4. **Deploy.** En los logs debe aparecer `esquema creado`, `Proofly: http://0.0.0.0:…` y `vault mUSDC: activo`.
5. **Antes de entregarle el link al profesor**, ábralo usted unos minutos antes para que esté despierto. Si no, verá la pantalla de carga de Render cerca de 1 minuto.

**Importante:** use solo una opción a la vez. Si corren dos workers con la misma clave al mismo tiempo (por ejemplo, el de su PC y el de Render), pueden chocar al enviar transacciones.

---

## Paso a paso en Railway

### 1. Antes de subir a GitHub
- Verifique que `.env.local` **no** aparezca en `git status`. Ya está en `.gitignore`, igual que cualquier `.env.*` excepto `.env.example`.
- Suba todos los archivos nuevos del MVP (contratos, scripts, `apps/web/src/lib`, etc.). Hoy varios están sin seguimiento en git.

### 2. Crear el proyecto
1. railway.com → **New Project → Deploy from GitHub repo** → elija el repositorio.
2. En el mismo proyecto: **New → Database → PostgreSQL**.

### 3. Servicio web
Settings del servicio que creó el repositorio:
- **Build command:** `npm ci --include=dev && npm run build`. El `--include=dev` es necesario porque, con `NODE_ENV=production`, npm omite Vite.
- **Start command:** `npm start`
- **Networking → Generate Domain**: así obtiene la URL pública, por ejemplo `proofly-production.up.railway.app`.

Variables (pestaña Variables):
```
NODE_ENV=production
PERSISTENCE=postgres
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_SSL=false
SERVER_HMAC_SECRET=<cadena aleatoria de 48+ caracteres>
BLOCKCHAIN_ADAPTER=viem
CHAIN_ID=11155111
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PROOFLY_OPERATIONS_ADDRESS=0xdA03f2AfBeB77a47843466252e04d7dA284DaBA3
PROOFLY_KYC_REGISTRY_ADDRESS=0x407B83F792895E2d88B8b96e1A640b0Fa3A2De11
MOCK_USDC_ADDRESS=0x776991CA67ec0DAb8907FD84d08143BcA2050C0b
DEMO_COP_PER_USDC=4000
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_PROOFLY_OPERATIONS_ADDRESS=0xdA03f2AfBeB77a47843466252e04d7dA284DaBA3
VITE_MOCK_USDC_ADDRESS=0x776991CA67ec0DAb8907FD84d08143BcA2050C0b
```
- El servicio web **no lleva `OPERATOR_PRIVATE_KEY`**.
- `DATABASE_SSL=false` funciona porque se usa la conexión interna de Railway. Si conecta desde fuera de Railway, use `true`.
- Para generar el secreto: `node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"`.

En el primer arranque, la app crea las tablas sola (`Base de datos vacía: esquema creado…` en los logs).

### 4. Servicio worker
**New → GitHub Repo** → el mismo repositorio. Así queda un segundo servicio.
- **Build command:** `npm ci`
- **Start command:** `npm run start:worker`
- Sin dominio público.

Variables: las mismas del web (sin las `VITE_*`), más estas:
```
OPERATOR_PRIVATE_KEY=<la de su .env.local>
DEMO_ONBOARD_MUSDC=1000
DEMO_ONBOARD_ETH_WEI=10000000000000000
```
En los logs debe aparecer `vault mUSDC: activo` y la dirección del operador `0xbe01…`.

### 5. Probar
1. Abra la URL pública → **Crear cuenta** → Ajustes → **Verificar identidad**.
2. **Conectar MetaMask** (red Sepolia). En menos de un minuto, el worker habilita la wallet: KYC on-chain, 1.000 mUSDC y 0,01 ETH para el gas. En Ajustes, "KYC on-chain" pasa de "Habilitando…" a "Verificado".
3. Con otra cuenta, cree una factura y acéptela. Con la primera, invierta, registre el recaudo y retire.

### 6. Mantenimiento
- **Gas del operador:** cada wallet nueva recibe 0,01 ETH y cada apertura o liquidación consume gas. Con unos 0,37 ETH alcanza para unas 25 a 30 wallets nuevas. Revise el saldo con `node --experimental-strip-types scripts/vault-status.mjs`, o ponga `DEMO_ONBOARD_ETH_WEI=0` para no regalar gas.
- **Sesiones en memoria:** cada redeploy cierra la sesión de todos. Es normal en este MVP.
- **Nunca** pegue la clave del operador en el servicio web ni en el repositorio.

## Cambios hechos en el código para el despliegue

1. `HOST`: en producción escucha en `0.0.0.0`; en local sigue en `127.0.0.1` (`scripts/dev.mjs`, `server.mjs`).
2. `npm run build` + `npm start` (sin recompilar al arrancar) y `npm run start:worker`. Además, `engines` y `.node-version` para fijar la versión de Node.
3. `DATABASE_SSL=true` activa la conexión cifrada a Postgres (`pg-client.ts`).
4. El esquema se crea solo en una base vacía (`scripts/db-init.mjs`, también como `npm run db:init`).
5. En producción, la app exige un `SERVER_HMAC_SECRET` propio y `PERSISTENCE=postgres`; las cookies quedan seguras automáticamente.
6. Habilitación automática de wallets nuevas: al verificar la identidad y vincular la wallet, el worker registra el KYC on-chain y envía mUSDC y ETH de prueba (evento `WALLET_ONBOARDING_REQUESTED`). La UI lo muestra como "Habilitando…".
