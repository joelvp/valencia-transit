import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/adapters/out/persistence/drizzle/db";

type TableName =
  | "stations"
  | "routes"
  | "route_stations"
  | "lines"
  | "line_stations"
  | "schedules"
  | "schedule_exceptions"
  | "trips"
  | "passing_times"
  | "dataset_versions"
  | "domain_events"
  | "analytics_events"
  | "users";

const ALL_TABLES: TableName[] = [
  "passing_times",
  "trips",
  "schedule_exceptions",
  "schedules",
  "line_stations",
  "lines",
  "route_stations",
  "routes",
  "stations",
  "domain_events",
  "analytics_events",
  "dataset_versions",
  "users",
];

export async function clearDatabase(db: AppDatabase): Promise<void> {
  await clearTables(db, ...ALL_TABLES);
}

export async function clearTables(db: AppDatabase, ...tables: TableName[]): Promise<void> {
  const tableList = tables.join(", ");
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableList} CASCADE`));
}
