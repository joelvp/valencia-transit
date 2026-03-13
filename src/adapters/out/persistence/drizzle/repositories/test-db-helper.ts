import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../schema";
import { sql as sqlTag } from "drizzle-orm";

const CONNECTION_STRING =
  process.env["DATABASE_URL"] || "postgres://metro:metro@localhost:5432/metrovalencia";

export function createTestSetup() {
  const sql = postgres(CONNECTION_STRING);
  const db = drizzle(sql, { schema });

  async function cleanDatabase() {
    await db.execute(
      sqlTag`TRUNCATE TABLE passing_times, trips, schedule_exceptions, schedules, line_stations, lines, stations, domain_events, dataset_versions CASCADE`,
    );
  }

  async function closeDatabase() {
    await sql.end();
  }

  return { db, cleanDatabase, closeDatabase };
}
