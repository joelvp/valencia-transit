import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import * as schema from "./schema";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

export function createDatabase(sql: Sql): AppDatabase {
  return drizzle(sql, { schema });
}
