import { describe, it, expect } from "bun:test";
import { assertSafeTestDatabase } from "./assertSafeTestDatabase";

describe("assertSafeTestDatabase", () => {
  it("should allow an unset database URL", () => {
    expect(() => assertSafeTestDatabase(undefined)).not.toThrow();
  });

  it("should allow a local test database", () => {
    expect(() =>
      assertSafeTestDatabase("postgres://metro:metro@localhost:5433/metrovalencia_test"),
    ).not.toThrow();
    expect(() =>
      assertSafeTestDatabase("postgresql://postgres:postgres@127.0.0.1:5432/metrovalencia_test"),
    ).not.toThrow();
  });

  it("should refuse a remote host", () => {
    expect(() =>
      assertSafeTestDatabase("postgres://user:pass@db.example.com:5432/metrovalencia_test"),
    ).toThrow(/not local/);
  });

  it("should refuse the local app database", () => {
    expect(() =>
      assertSafeTestDatabase("postgres://metro:metro@localhost:5432/metrovalencia"),
    ).toThrow(/only databases ending in "_test"/);
  });

  it("should refuse an invalid URL", () => {
    expect(() => assertSafeTestDatabase("not a url")).toThrow(/not a valid URL/);
  });
});
