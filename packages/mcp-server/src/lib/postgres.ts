import pg from "pg";

import { getDatabaseUrl } from "../env.js";

let _pool: pg.Pool | undefined;

export function pool(): pg.Pool {
  if (!_pool) {
    _pool = new pg.Pool({
      connectionString: getDatabaseUrl(),
      max: 4,
      idleTimeoutMillis: 30_000,
    });
  }
  return _pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = undefined;
  }
}
