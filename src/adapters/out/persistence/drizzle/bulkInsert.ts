import type { PgTable } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "./schema";

const CHUNK_SIZE = 1000;

export async function bulkInsert<T extends Record<string, unknown>>(
  db: PostgresJsDatabase<typeof schema>,
  table: PgTable,
  rows: T[],
): Promise<void> {
  if (rows.length === 0) return;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await db.insert(table).values(chunk);
  }
}
