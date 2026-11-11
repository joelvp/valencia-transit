import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const MIGRATIONS_FOLDER = `${import.meta.dir}/../../drizzle`;

/** Applies pending migrations to the test DB. Returns why it couldn't reach it, or null when ready.
 *  A broken migration throws: that is a code error, not a setup one. */
export async function prepareTestDatabase(databaseUrl: string): Promise<string | null> {
  const sql = postgres(databaseUrl, { max: 1, connect_timeout: 2, onnotice: () => {} });
  try {
    try {
      await sql`select 1`;
    } catch {
      return `Test database is not reachable at ${new URL(databaseUrl).host}. Start it with \`bun run test:db\`.`;
    }
    await migrate(drizzle(sql), { migrationsFolder: MIGRATIONS_FOLDER });
    return null;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
