/**
 * @proofly/api - Servidor REST Principal
 */

import { validateEnv } from './config/env.schema.ts';
import { createDependencies, createProoflyApiServer, seedDemoData } from './app.ts';

const config = validateEnv(process.env);
const deps = createDependencies();

await seedDemoData(deps);

const server = createProoflyApiServer(deps);

server.listen(config.PORT, () => {
  console.log(`[Proofly Core API] Corriendo en http://localhost:${config.PORT} [MODO: ${config.ENV_MODE.toUpperCase()}]`);
  console.log(`[Proofly Core API] Base L2 Chain ID: ${config.CHAIN_ID}`);
  console.log(`[Proofly Core API] Documentación OpenAPI en api/openapi.yaml`);
});
