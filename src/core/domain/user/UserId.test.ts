import { describe, it, expect } from "bun:test";
import { UserId } from "./UserId.ts";

describe("UserId", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("should create with a valid UUID v4", () => {
    const id = new UserId(validUuid);
    expect(id.value).toBe(validUuid);
  });

  it("should throw on empty string", () => {
    expect(() => new UserId("")).toThrow("UserId cannot be empty");
  });

  it("should throw on non-UUID string", () => {
    expect(() => new UserId("not-a-uuid")).toThrow("UserId must be a valid UUID v4");
  });

  it("should throw on UUID v1 (wrong version)", () => {
    expect(() => new UserId("550e8400-e29b-11d4-a716-446655440000")).toThrow(
      "UserId must be a valid UUID v4",
    );
  });

  it("should be equal when values match", () => {
    expect(new UserId(validUuid).equals(new UserId(validUuid))).toBe(true);
  });

  it("should not be equal when values differ", () => {
    expect(new UserId(validUuid).equals(new UserId("6ba7b810-9dad-41d4-80b4-00c04fd430c8"))).toBe(
      false,
    );
  });
});
