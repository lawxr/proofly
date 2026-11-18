// Creates the PostgreSQL schema (db/schema.sql) on an empty database. Safe to run
// on every start: if the tables already exist it does nothing.
// CLI: node scripts/db-init.mjs   (reads DATABASE_URL and DATABASE_SSL)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

export async function ensureSchema({ connectionString, ssl = false }) {
  const client = new pg.Client({ connectionString, ...(ssl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await client.connect();
  try {
    const { rows } = await client.query(`SELECT to_regclass('public.users') IS NOT NULL AS ready`);
    if (rows[0].ready) return { created: false };
    // pgcrypto may be unavailable on some managed plans; the schema does not depend on it.
    const sql = readFileSync(resolve(root, 'db/schema.sql'), 'utf8')
      .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/, '');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    return { created: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.loadEnvFile(resolve(root, '.env.local')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const result = await ensureSchema({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' });
  console.log(result.created ? 'Esquema creado.' : 'El esquema ya existía; no se cambió nada.');
}
