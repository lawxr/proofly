/**
 * Proofly - Script de Pruebas de Carga (Fase 7 QA)
 * Simula tráfico sostenido y concurrente sobre endpoints críticos
 * Mide latencias p50, p90, p95, p99 y tasas de error.
 */

import http from 'node:http';
import { createDependencies, seedDemoData, createProoflyApiServer } from '../apps/api/src/app.ts';

async function runLoadTest() {
  console.log('=== Proofly Load Test Suite (Fase 7) ===');

  const deps = createDependencies();
  await seedDemoData(deps);
  const server = createProoflyApiServer(deps);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`Servidor API iniciado en ${baseUrl}`);

  const endpoints = [
    { name: 'GET /health', method: 'GET', path: '/health' },
    {
      name: 'POST /quotes/simulate',
      method: 'POST',
      path: '/api/v1/quotes/simulate',
      body: JSON.stringify({ nominalAmountCents: 500000000, termDays: 30 })
    },
    { name: 'GET /marketplace', method: 'GET', path: '/api/v1/marketplace' }
  ];

  const TOTAL_REQUESTS = 500;
  const CONCURRENCY = 25;
  const latencies = [];
  let successfulRequests = 0;
  let failedRequests = 0;

  console.log(`Iniciando prueba: ${TOTAL_REQUESTS} peticiones con concurrencia de ${CONCURRENCY}...`);
  const startTime = Date.now();

  const makeRequest = async (ep) => {
    const t0 = performance.now();
    try {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.body
      });
      const t1 = performance.now();
      latencies.push(t1 - t0);
      if (res.ok) {
        successfulRequests++;
      } else {
        failedRequests++;
      }
    } catch (err) {
      failedRequests++;
    }
  };

  // Ejecución en batches concurrentes
  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < CONCURRENCY && i + j < TOTAL_REQUESTS; j++) {
      const ep = endpoints[(i + j) % endpoints.length];
      batch.push(makeRequest(ep));
    }
    await Promise.all(batch);
  }

  const totalDurationSeconds = (Date.now() - startTime) / 1000;
  server.close();

  // Cálculo de estadísticas
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)].toFixed(2);
  const p90 = latencies[Math.floor(latencies.length * 0.90)].toFixed(2);
  const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);
  const p99 = latencies[Math.floor(latencies.length * 0.99)].toFixed(2);
  const rps = (TOTAL_REQUESTS / totalDurationSeconds).toFixed(2);

  console.log('\n--- RESULTADOS DE CARGA ---');
  console.log(`Duración total:     ${totalDurationSeconds.toFixed(2)}s`);
  console.log(`Throughput:         ${rps} req/s`);
  console.log(`Éxito:              ${successfulRequests} / ${TOTAL_REQUESTS} (${((successfulRequests / TOTAL_REQUESTS) * 100).toFixed(1)}%)`);
  console.log(`Fallos:             ${failedRequests}`);
  console.log(`Latencia p50:       ${p50} ms`);
  console.log(`Latencia p90:       ${p90} ms`);
  console.log(`Latencia p95:       ${p95} ms (Meta: < 150 ms)`);
  console.log(`Latencia p99:       ${p99} ms`);

  if (Number(p95) < 150 && failedRequests === 0) {
    console.log('\n[PASS] Criterios de Rendimiento y Carga Cumplidos al 100%.');
    process.exit(0);
  } else {
    console.error('\n[FAIL] Los criterios de rendimiento no fueron alcanzados.');
    process.exit(1);
  }
}

runLoadTest().catch((err) => {
  console.error('Error en prueba de carga:', err);
  process.exit(1);
});

