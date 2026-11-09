/**
 * Simulación matemática de usuarios de Proofly.
 *
 * Proyecta cohortes de freelancers que originan operaciones mes a mes, usando el
 * MOTOR FINANCIERO REAL del dominio (FinancialEngine.calculateQuote y TiersPolicy),
 * no fórmulas inventadas. Mide los unit economics de la plataforma y compara
 * palancas de mejora (tasa de descuento, fee, retención, ticket promedio).
 *
 * Uso: node --experimental-strip-types scripts/simulate-users.mjs
 *
 * Nota: proyecto de demostración. Los supuestos de comportamiento (adopción,
 * retención, ticket) son parámetros ilustrativos, marcados como tales; la
 * aritmética financiera por operación es la del dominio.
 */

import { FinancialEngine, TiersPolicy, FreelancerTier } from '../packages/domain/src/index.ts';

const COP = cents => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(cents) / 100);
const pct = x => (x * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + '%';

// --- Supuestos de comportamiento (ILUSTRATIVOS, no datos reales) ---
const DEFAULTS = {
  months: 12,
  newFreelancersPerMonth: 40,   // adopción mensual
  monthlyRetention: 0.82,       // fracción que sigue activa el mes siguiente
  opsPerActivePerMonth: 1.2,    // operaciones que origina un freelancer activo al mes
  monthlyDiscountRate: 0.02,    // 2% mensual (palanca de precio)
  prooflyFeeRate: 0.01,         // 1% fee de plataforma (palanca de ingreso)
  avgTermDays: 30,
  // Ticket promedio por tier (centavos). Dentro del cupo de cada tier.
  avgTicketByTier: {
    [FreelancerTier.TIER_1_SEED]: 150000000n,    // $1.5M
    [FreelancerTier.TIER_2_GROWTH]: 500000000n,  // $5M
    [FreelancerTier.TIER_3_PRO]: 1500000000n,    // $15M
  },
  usuryRateBps: 2832, // tope de usura ilustrativo (~28.3% E.A.)
};

// Un freelancer progresa de tier por operaciones liquidadas y score.
function tierForOpsDone(opsDone) {
  // executionScore crece con la experiencia; ilustrativo: parte en 72 y sube.
  const score = Math.min(98, 72 + opsDone * 3);
  return TiersPolicy.determineTier(opsDone, score);
}

function runScenario(cfg) {
  const p = { ...DEFAULTS, ...cfg };
  // Cohorte: cada freelancer lleva cuántas operaciones liquidó (para su tier).
  // Modelamos el agregado por simplicidad: una lista de "freelancers activos".
  let active = []; // cada item: { opsDone }
  const totals = {
    operations: 0,
    originatedCents: 0n,     // valor nominal total originado
    advancedCents: 0n,       // adelantado a freelancers
    platformFeeCents: 0n,    // ingreso de Proofly
    investorProfitCents: 0n, // ganancia total a financiadores
    byTier: { TIER_1_SEED: 0, TIER_2_GROWTH: 0, TIER_3_PRO: 0 },
  };

  for (let m = 0; m < p.months; m++) {
    // Retención del mes anterior + nuevos.
    active = active.filter(() => Math.random() < p.monthlyRetention);
    for (let i = 0; i < p.newFreelancersPerMonth; i++) active.push({ opsDone: 0 });

    for (const f of active) {
      const tier = tierForOpsDone(f.opsDone);
      const config = TiersPolicy.TIER_CONFIG[tier];
      // El descuento del tier reduce la tasa (rateDiscountBps en puntos básicos).
      const effMonthlyRate = Math.max(0, p.monthlyDiscountRate - config.rateDiscountBps / 10000);
      const nominal = p.avgTicketByTier[tier];
      // Número de operaciones este mes, acotado por el tope de operaciones activas del tier.
      const ops = Math.min(config.maxActiveOperations, Math.max(0, Math.round(p.opsPerActivePerMonth)));
      for (let o = 0; o < ops; o++) {
        const q = FinancialEngine.calculateQuote({
          nominalAmountCents: nominal,
          termDays: p.avgTermDays,
          monthlyDiscountRate: effMonthlyRate,
          prooflyFeeRate: p.prooflyFeeRate,
          maxLegalUsuryRateBps: p.usuryRateBps,
        });
        totals.operations++;
        totals.originatedCents += q.nominalAmountCents;
        totals.advancedCents += q.advanceAmountCents;
        totals.platformFeeCents += q.prooflyFeeCents;
        totals.investorProfitCents += q.commercialDiscountCents; // la ganancia del financiador
        totals.byTier[tier]++;
        f.opsDone++;
      }
    }
  }
  totals.activeEndFreelancers = active.length;
  return totals;
}

function summarize(name, t) {
  const takeRate = Number(t.platformFeeCents) / Number(t.originatedCents || 1n);
  console.log(`\n=== ${name} ===`);
  console.log(`Operaciones originadas:      ${t.operations.toLocaleString('es-CO')}`);
  console.log(`Volumen originado (nominal): ${COP(t.originatedCents)}`);
  console.log(`Adelantado a freelancers:    ${COP(t.advancedCents)}`);
  console.log(`Ingreso de Proofly (fees):   ${COP(t.platformFeeCents)}`);
  console.log(`Ganancia a financiadores:    ${COP(t.investorProfitCents)}`);
  console.log(`Take rate (fee / volumen):   ${pct(takeRate)}`);
  console.log(`Freelancers activos al final:${t.activeEndFreelancers.toLocaleString('es-CO')}`);
  console.log(`Mezcla de operaciones:       Semilla ${t.byTier.TIER_1_SEED} · Crecimiento ${t.byTier.TIER_2_GROWTH} · Pro ${t.byTier.TIER_3_PRO}`);
  return { name, platformFeeCents: t.platformFeeCents, originatedCents: t.originatedCents, operations: t.operations };
}

// Semilla determinista para reproducibilidad del Math.random.
let seed = 42;
Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

console.log('Proofly · Simulación de usuarios (12 meses) — proyecto de demostración');
console.log('Aritmética por operación: motor real del dominio. Supuestos de comportamiento: ilustrativos.');

const base = summarize('Escenario base', runScenario({}));

// Palancas de mejora: una a la vez vs. base.
const lever1 = summarize('Mejor retención (82% -> 90%)', runScenario({ monthlyRetention: 0.90 }));
const lever2 = summarize('Fee de plataforma 1% -> 1.5%', runScenario({ prooflyFeeRate: 0.015 }));
const lever3 = summarize('Más adopción (40 -> 70/mes)', runScenario({ newFreelancersPerMonth: 70 }));
const lever4 = summarize('Ticket +30% por tier', runScenario({
  avgTicketByTier: {
    [FreelancerTier.TIER_1_SEED]: 195000000n,
    [FreelancerTier.TIER_2_GROWTH]: 650000000n,
    [FreelancerTier.TIER_3_PRO]: 1950000000n,
  }
}));

// Comparativa de impacto sobre el ingreso de la plataforma.
console.log('\n=== Impacto en ingreso de Proofly vs. base ===');
for (const s of [lever1, lever2, lever3, lever4]) {
  const delta = Number(s.platformFeeCents - base.platformFeeCents) / Number(base.platformFeeCents);
  console.log(`${s.name.padEnd(34)} ${COP(s.platformFeeCents)}  (${delta >= 0 ? '+' : ''}${pct(delta)})`);
}

console.log('\nLectura: la retención y la adopción mueven el volumen (y con él fees y liquidez);');
console.log('el fee sube el ingreso por operación pero encarece al freelancer (vigilar el tope de usura);');
console.log('el ticket por tier concentra volumen en usuarios maduros. Mejor combinacion: retener + crecer ticket.');
process.exit(0);
