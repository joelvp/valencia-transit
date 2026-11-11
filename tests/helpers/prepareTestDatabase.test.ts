import { describe, it, expect } from "bun:test";
import { prepareTestDatabase } from "./prepareTestDatabase";

describe("prepareTestDatabase", () => {
  it("should report nothing when the test database is reachable", async () => {
    expect(await prepareTestDatabase(process.env["DATABASE_URL"]!)).toBeNull();
  });

  it("should tell how to fix an unreachable database", async () => {
    const problem = await prepareTestDatabase(
      "postgres://metro:metro@localhost:1/metrovalencia_test",
    );

    expect(problem).toContain("not reachable at localhost:1");
    expect(problem).toContain("bun run test:db");
  });
});
