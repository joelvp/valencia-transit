import { describe, it, expect } from "bun:test";
import { ChatId } from "./ChatId";

describe("ChatId", () => {
  it("should create a ChatId with a valid bigint", () => {
    const id = new ChatId(123456789n);
    expect(id.value).toBe(123456789n);
  });

  it("should throw on zero", () => {
    expect(() => new ChatId(0n)).toThrow("ChatId must be greater than 0");
  });

  it("should throw on negative value", () => {
    expect(() => new ChatId(-1n)).toThrow("ChatId must be greater than 0");
  });

  it("should be equal to another ChatId with the same value", () => {
    expect(new ChatId(42n).equals(new ChatId(42n))).toBe(true);
  });

  it("should not be equal to a ChatId with a different value", () => {
    expect(new ChatId(42n).equals(new ChatId(99n))).toBe(false);
  });
});
