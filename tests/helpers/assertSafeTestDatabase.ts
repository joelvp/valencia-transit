const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const TEST_DATABASE_SUFFIX = "_test";

/** Tests wipe every table: only a local database named `*_test` is allowed. See docs/database-environments.md. */
export function assertSafeTestDatabase(databaseUrl: string | undefined): void {
  if (!databaseUrl) return;

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("Refusing to run tests: DATABASE_URL is not a valid URL");
  }

  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `Refusing to run tests: DATABASE_URL host "${url.hostname}" is not local. ` +
        "Tests wipe every table. See docs/database-environments.md.",
    );
  }

  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      `Refusing to run tests against "${databaseName}": only databases ending in ` +
        `"${TEST_DATABASE_SUFFIX}" are allowed. Is .env.test missing? See docs/database-environments.md.`,
    );
  }
}
