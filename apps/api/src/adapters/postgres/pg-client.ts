/**
 * @proofly/api - SqlClient concreto sobre node-postgres (pg)
 *
 * Implementa la interfaz SqlClient que esperan los repositorios Postgres,
 * usando un pool de conexiones real. Es la pieza que faltaba para que los
 * repos dejen de ser solo unit-testeables con mocks y corran contra una DB.
 */

import pg from 'pg';
import type { SqlClient, SqlQueryResult } from './postgres-repositories.ts';

export interface PgClientConfig {
  connectionString: string;
  max?: number;
}

export class PgSqlClient implements SqlClient {
  private readonly pool: pg.Pool;

  constructor(config: PgClientConfig) {
    this.pool = new pg.Pool({ connectionString: config.connectionString, max: config.max ?? 10 });
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<SqlQueryResult<T>> {
    const result = await this.pool.query(sql, params as unknown[]);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
