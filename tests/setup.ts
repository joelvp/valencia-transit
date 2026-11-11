// Preloaded by bun test (bunfig.toml). See docs/database-environments.md.
import { assertSafeTestDatabase } from "./helpers/assertSafeTestDatabase";
import { prepareTestDatabase } from "./helpers/prepareTestDatabase";

const databaseUrl = process.env["DATABASE_URL"];
assertSafeTestDatabase(databaseUrl);

if (databaseUrl) {
  const problem = await prepareTestDatabase(databaseUrl);
  // Warn, don't abort: unit tests still run without a database.
  if (problem) console.warn(`\n⚠️  ${problem} Database tests will fail.\n`);
}
