import "server-only";
import { Pool } from "@neondatabase/serverless";

let pool: Pool | null = null;

function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
}

export function isNeonConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
}

export async function runQuery<T = any>(sqlQuery: string, params: any[] = []): Promise<T[]> {
  const clientPool = getPool();
  if (clientPool) {
    try {
      const result = await clientPool.query(sqlQuery, params);
      return result.rows as T[];
    } catch (err) {
      console.error("Neon DB query error:", err);
      throw err;
    }
  }
  throw new Error("NEON_NOT_CONFIGURED");
}
