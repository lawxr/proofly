/**
 * @proofly/worker - Proceso Asíncrono de Outbox e Indexación EVM
 */

console.log('[Proofly Worker] Inicializando Outbox Dispatcher y EVM Indexer...');

let isRunning = true;

process.on('SIGINT', () => { isRunning = false; });
process.on('SIGTERM', () => { isRunning = false; });

async function pollLoop() {
  while (isRunning) {
    // Polling outbox_events SKIP LOCKED
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('[Proofly Worker] Worker finalizado con gracia.');
}

pollLoop().catch(console.error);

