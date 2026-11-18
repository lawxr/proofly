# Proofly · Guion de la presentación y contexto del proyecto

Complementa `docs/pitch/proofly-deck.md`, que tiene el contenido de cada diapositiva.
Duración objetivo: **5 minutos de pitch + 3 minutos de demo + preguntas**.

---

# Parte 1 · Guion del pitch

Para cada diapositiva: qué se dice (en voz alta, tono natural) y cuánto tiempo toma. Las cifras de piloto y mercado son metas; dígalas como metas.

### 1. Título (15 s)
> "Somos Proofly. Ayudamos a que los freelancers cobren hoy lo que la empresa les va a pagar en 60 días, y a que otras personas ganen un retorno claro financiando ese adelanto."

### 2. Problema (40 s)
> "En Colombia, 9,6 millones de personas trabajan por cuenta propia, casi 4 de cada 10 ocupados.
> Les pongo un caso: Laura es diseñadora. Termina un proyecto de 4 millones para una agencia, emite la factura… y la agencia le paga a 60 días. Ese mes tiene que pagar arriendo y licencias.
> Laura tiene ingresos, pero no tiene liquidez. El banco no le presta porque sus ingresos son variables y lleva poco tiempo facturando."

### 3. Solución (40 s)
> "Con Proofly, Laura sube su factura y en minutos ve cuánto recibe hoy.
> Si la factura es de un millón a 30 días, recibe 970.000. Son 20.000 de descuento y 10.000 de comisión, y lo ve todo antes de aceptar.
> Del otro lado, un financiador pone los 970.000 y, cuando la empresa paga, recibe 990.000: un 27,75 % efectivo anual. Proofly reparte el dinero de forma automática."

### 4. Tracción (35 s)
> "El MVP ya funciona de punta a punta: crear la factura, invertir desde una wallet, completar el fondeo, registrar el pago y retirar capital más ganancia.
> Lo probamos en una red pública de pruebas, con transacciones que cualquiera puede revisar. En la última prueba entraron 97 y salieron 99: el capital más la ganancia exacta, al centavo.
> La meta del piloto es pasar de 10 facturas en el primer mes a 400 al mes en el mes 12."

### 5. Más métricas (25 s)
> "A 12 meses buscamos anticipar 1.200 millones de pesos al mes, que el 70 % de los financiadores vuelva a invertir y que el freelancer tenga su dinero en menos de 24 horas."

### 6. Insight (45 s): la diapositiva más importante
> "¿Por qué no existe ya? Porque nadie comparte un registro confiable de quién es dueño de cada cobro.
> El freelancer, la empresa y cada financiador llevan su propia cuenta, y la misma factura se puede vender dos veces.
> Proofly registra cada operación con una huella única, sin datos personales, y el sistema bloquea cualquier segundo intento.
> Las participaciones de los financiadores quedan en un registro público. El reparto lo hace un contrato, al centavo, y cualquiera puede auditarlo.
> Por eso usamos blockchain: hay varias partes que no confían entre sí, y ninguna debería controlar el registro sola."

### 7. Modelo de negocio (30 s)
> "Cobramos el 1 % de cada factura financiada. En una factura promedio de 3 millones son 30.000 pesos; el costo de verificar y operar es cerca de 12.000, así que el margen es del 60 %.
> Cuando la empresa paga, el orden es fijo: primero el financiador, luego nuestra comisión y lo que sobre es para el freelancer."

### 8. Mercado (30 s)
> "Las facturas negociadas en RADIAN, el registro de la DIAN, pasaron de 11 billones de pesos en 2022 a casi 47 billones en 2025. Se multiplicaron por cuatro en tres años, pero casi todo ese volumen es de empresas.
> Si solo el 5 % de los independientes factura a empresas, son 480.000 freelancers. Con 6 facturas al año y nuestra comisión, es un mercado de 86.000 millones de pesos al año."

### 9. Equipo (20 s)
> "Somos freelancers: vivimos la espera de 60 días. Y sabemos construir: el MVP completo, contratos inteligentes incluidos, lo hicimos nosotros."

### 10. El pedido (20 s)
> "Levantamos 350.000 dólares para hacer un piloto de 12 meses con 300 freelancers y 50 financiadores, contratar 3 ingenieros, auditar los contratos y operar con un aliado de factoring habilitado.
> En un año queremos 400 facturas al mes. Gracias."

**Total aproximado: 5 minutos.**

---

# Parte 2 · Guion de la demo en vivo (3 min)

### Antes de presentar (checklist)
1. Abrir **Docker Desktop** y esperar a que esté en verde.
2. Terminal 1: `npm run dev`. Esperar a ver `Proofly: http://127.0.0.1:3000` y `Persistencia: Postgres`.
3. Terminal 2: `npm run dev --workspace @proofly/worker`. Esperar a ver `vault mUSDC: activo`.
4. MetaMask en **Ethereum Sepolia**, con la wallet vinculada a la cuenta que va a invertir.
5. Dejar preparada una factura en estado "Disponible", para no esperar en vivo.
6. Abrir Etherscan en otra pestaña: https://sepolia.etherscan.io

### Paso a paso
| # | Pantalla | Qué hacer | Qué decir |
|---|---|---|---|
| 1 | Inicio | Mostrar capital invertido y cupo | "Esta es la cuenta: lo que invierto y lo que puedo anticipar." |
| 2 | Anticipar → Nueva | Factura de $1.000.000, 30 días, empresa "Estudio Nube" | "Así sube Laura su factura." |
| 3 | Requisitos → Revisión | Marcar las declaraciones y ver el anticipo | "Antes de aceptar ve exactamente cuánto recibe." |
| 4 | Enviar → Aceptar cotización | Aceptar | "Al aceptar, la operación queda abierta a financiadores." |
| 5 | Otra cuenta → Invertir | Abrir la factura disponible | "Ahora soy el financiador. Veo la tasa, el plazo y los riesgos." |
| 6 | Panel "Vault mUSDC" | Aprobar y luego depositar en MetaMask | "Firmo con mi wallet. El dinero queda en el contrato, no en una cuenta nuestra." |
| 7 | "Depósito confirmado" | Abrir el hash en Etherscan | "Cualquiera puede verificar este aporte." |
| 8 | Registrar recaudo | Pulsar y esperar unos 30 s | "La empresa pagó. El sistema liquida automáticamente." |
| 9 | Retirar | Retirar capital + ganancia | "Recibo el capital y la ganancia en mi wallet." |
| 10 | Mis inversiones | Mostrar "Retiraste…" y el token | "Todo queda registrado y auditable." |

### Si algo falla en vivo
- **"Abriendo la operación on-chain"** se queda girando: el worker no está corriendo. Arránquelo en la terminal 2.
- **Error de conexión a la base de datos:** Docker está apagado. Ábralo y repita `npm run dev`.
- **MetaMask en otra red o con otra wallet:** la app lo dice; cambie a Sepolia y a la wallet vinculada.
- **Plan B:** muestre las transacciones ya hechas en Etherscan (Parte 4) y diga: *"esto ya corrió en vivo antes; aquí están las pruebas públicas"*.

---

# Parte 3 · Preguntas difíciles y cómo responderlas

**¿Por qué blockchain y no una base de datos normal?**
> "Hay varias partes que no confían entre sí: financiadores, freelancers y empresas. Con una base de datos nuestra, todos tendrían que confiar en nosotros. On-chain, cualquiera verifica quién es dueño de cada participación y cómo se repartió el dinero, y nosotros no podemos alterarlo después."

**¿Eso evita que la factura se financie en otra plataforma?**
> "No, por sí solo no. Para eso verificamos la factura en RADIAN de la DIAN antes de abrirla. La blockchain evita la doble emisión dentro de Proofly y deja la trazabilidad."

**¿El dinero de la demo es real?**
> "No. Usamos un token de prueba sin valor, en una red de pruebas. En producción el usuario opera en pesos y la parte técnica queda oculta."

**¿Qué pasa si la empresa no paga?**
> "El financiador puede perder capital, y lo decimos en la app. Lo mitigamos con un puntaje separado para el freelancer y para la empresa, límites por pagador y un cupo que crece con el historial."

**¿Necesitan licencia de la Superfinanciera?**
> "Depende de la estructura. Por eso el piloto opera con un factor o fiduciaria habilitada, y parte de la ronda va a legal y cumplimiento."

**¿Cómo ganan dinero?**
> "1 % de cada factura financiada, que se retiene automáticamente cuando la empresa paga."

**¿Cuál es el riesgo técnico más grande?**
> "Los contratos inteligentes no tienen auditoría externa. Por eso el 10 % de la ronda va a una auditoría antes de manejar dinero real."

**¿Por qué ustedes?**
> "Somos el usuario: freelancers que esperan para cobrar. Y ya construimos el producto completo."

---

# Parte 4 · Contexto completo del proyecto

## Qué es Proofly
Una plataforma donde:
- un **freelancer** adelanta el cobro de una factura electrónica o de un hito de proyecto;
- un **financiador** la fondea a cambio de un descuento;
- la **empresa pagadora** paga al vencimiento, y Proofly reparte capital, ganancia y comisión.

La unidad comercial es el peso colombiano. La blockchain registra la titularidad de las participaciones y la liquidación.

## Estado actual (noviembre de 2026)
- **MVP funcional de punta a punta** en Ethereum Sepolia (red de pruebas).
- Pruebas automáticas: 88 de la aplicación y 46 de contratos, todas en verde.
- El ciclo completo (crear → invertir → liquidar → retirar) se validó varias veces con transacciones públicas.

## Qué es real y qué es simulado
| Real en el MVP | Simulado |
|---|---|
| Registro, inicio de sesión, cuentas en PostgreSQL | Verificación de identidad (KYC) |
| Crear factura o hito, cotización y aceptación | Validación de la factura en DIAN/RADIAN |
| Inversión desde MetaMask, liquidación y retiro on-chain | Desembolso bancario al freelancer |
| Reparto exacto al centavo | Pago de la empresa (se registra con un botón) |
| Registro anti-duplicado on-chain | El dinero: mUSDC, token de prueba (1 mUSDC = 4.000 COP) |

## Cómo funciona el flujo por dentro
1. **Crear y aceptar:** el freelancer crea la factura. El motor calcula descuento (2 % mensual), comisión (1 %) y anticipo. Al aceptar, la operación queda "Disponible".
2. **Abrir on-chain:** el *worker* (proceso en segundo plano) abre la operación en el contrato, con una meta igual al anticipo. Hasta que no tenga número de token, no se puede invertir.
3. **Invertir:** el financiador aprueba y deposita mUSDC desde MetaMask. El contrato le entrega participaciones (tokens ERC-1155).
4. **Sincronizar:** la app verifica la transacción en la red y registra el aporte en pesos en la base de datos. Si la misma transacción se envía de nuevo, no se cuenta dos veces.
5. **Fondeo completo:** cuando se cubre el 100 %, la operación pasa a "Fondeada" y aparece **Registrar recaudo**.
6. **Liquidar:** al registrar el recaudo, el worker aporta la ganancia al contrato y lo marca como liquidado.
7. **Retirar:** el financiador retira capital + ganancia. Sus participaciones se queman y no puede retirar dos veces.

## Componentes técnicos
| Parte | Tecnología | Dónde está |
|---|---|---|
| App web (móvil primero, modo claro) | React + Vite | `apps/web` |
| Servidor y reglas de negocio | Node.js + TypeScript, arquitectura hexagonal | `server.mjs`, `scripts/app-service.mjs`, `packages/domain` |
| Base de datos | PostgreSQL (Docker, puerto 55432) | `db/schema.sql` |
| Worker blockchain | Node.js, patrón outbox | `apps/worker` |
| Contratos | Solidity + OpenZeppelin, Foundry | `contracts/src` |

## Contratos desplegados (Ethereum Sepolia, chain 11155111)
| Contrato | Dirección |
|---|---|
| ProoflyOperations (vault + ERC-1155) | `0xdA03f2AfBeB77a47843466252e04d7dA284DaBA3` |
| ProoflyKYCRegistry | `0x407B83F792895E2d88B8b96e1A640b0Fa3A2De11` |
| MockUSDC (mUSDC, sin valor) | `0x776991CA67ec0DAb8907FD84d08143BcA2050C0b` |

Wallets de la demo:
- Operadora: `0xbe01Eb2da5E8FaE095a2599D394Aa91683Ff9352`. Abre y liquida operaciones, y también sirve como financiadora.
- Financiadora: `0x7b52FDA3e0B84a1B67aD0FfDA6f02cD4daD07616`.

Las dos tienen KYC on-chain.

## Transacciones de prueba (para mostrar en Etherscan)
Ciclo completo en el contrato nuevo (token 3):
- Aprobación: `0xaf4217fe57351b55dc49619f159901bd25d41a2b64b4513f5268bbbdcf2c22fa`
- Depósito de 97 mUSDC: `0x720dfbf9c876a4d2ce0481cb01232dae011af0b473dc55f4a2a3442c31e2b315`
- Liquidación: `0x112241ef095d944319c6a0776f3ba5eb6c9f0376a2f9a1f364604ba97ddf3e46`
- Retiro de 99 mUSDC: `0x01fcd9cd52950207e8b5028698a2801e9ae746de33bb48511cfcf1b849eb7d7f`

## Reglas que el sistema respeta
- El dinero se maneja en enteros (centavos COP y unidades mínimas de mUSDC), nunca con decimales flotantes.
- Ningún dato personal va on-chain; solo huellas (HMAC), montos, estados y direcciones.
- Una factura no se puede registrar ni financiar dos veces (en la base de datos y en el contrato).
- Sin verificación de identidad no se puede depositar, transferir ni retirar.
- Si la base de datos y el contrato no coinciden, la operación se bloquea y no se mueve dinero.
- El cupo inicial del freelancer es de $2.000.000 (nivel Semilla) y permite una operación activa a la vez; sube con cada operación liquidada.
- Con el vault activo, el valor de la factura debe ser múltiplo de $1.000.

## Comandos útiles
| Para qué | Comando |
|---|---|
| Levantar la base de datos | `docker compose up -d postgres` |
| App web + servidor | `npm run dev` → http://127.0.0.1:3000 |
| Worker blockchain | `npm run dev --workspace @proofly/worker` |
| Pruebas de la app | `npm test` |
| Pruebas de contratos | `cd contracts` y `forge test` |
| Ver saldos y estado del vault | `node --experimental-strip-types scripts/vault-status.mjs` |
| Dar mUSDC de prueba a una wallet | `node --experimental-strip-types scripts/mint-demo-usdc.mjs 0xWallet 500` |
| Prueba completa automática en Sepolia | `node --experimental-strip-types scripts/e2e-sepolia.mjs` |

## Seguridad (importante)
- La clave del operador vive solo en `.env.local`, que está en `.gitignore`. Nunca la suba, nunca la muestre en pantalla durante la presentación y no la use fuera de la red de pruebas.
- Antes de presentar, **cierre `.env.local`** del editor.

## Próximos pasos después del MVP
1. Auditoría externa de los contratos.
2. KYC real e integración con RADIAN para verificar facturas.
3. Pagos reales en pesos (PSE/ACH) con un aliado de factoring o una fiduciaria.
4. Reemplazar MetaMask por wallets gestionadas, para que el usuario no vea nada de cripto.
5. Piloto con 300 freelancers y 50 financiadores.
