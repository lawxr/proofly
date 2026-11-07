/**
 * @proofly/api - Servidor Principal
 */

import http from 'node:http';
import { validateEnv } from './config/env.schema.ts';

const config = validateEnv(process.env);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: 'Proofly API Core',
    status: 'online',
    mode: config.ENV_MODE,
    chainId: config.CHAIN_ID,
    timestamp: new Date().toISOString()
  }));
});

server.listen(config.PORT, () => {
  console.log(`[Proofly API] Corriendo en puerto ${config.PORT} en modo [${config.ENV_MODE.toUpperCase()}]`);
});

