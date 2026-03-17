import postgres from "postgres";

export function createSqlConnection(databaseUrl: string): postgres.Sql {
  return postgres(databaseUrl);
}
