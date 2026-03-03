import { describe, it, expect } from "bun:test";
import { StringValueObject } from "./StringValueObject.ts";
import { InvalidArgumentError } from "../error/InvalidArgumentError.ts";

class TestStringVO extends StringValueObject {}

describe("StringValueObject", () => {
  it("should store the value", () => {
    const vo = new TestStringVO("hello");
    expect(vo.value).toBe("hello");
  });

  it("should throw on empty string", () => {
    expect(() => new TestStringVO("")).toThrow(InvalidArgumentError);
  });

  it("should throw on whitespace-only string", () => {
    expect(() => new TestStringVO("   ")).toThrow(InvalidArgumentError);
  });

  it("should throw on null-like values", () => {
    expect(() => new TestStringVO(undefined as unknown as string)).toThrow(InvalidArgumentError);
    expect(() => new TestStringVO(null as unknown as string)).toThrow(InvalidArgumentError);
  });

  it("should be equal when values match", () => {
    const a = new TestStringVO("abc");
    const b = new TestStringVO("abc");
    expect(a.equals(b)).toBe(true);
  });

  it("should not be equal when values differ", () => {
    const a = new TestStringVO("abc");
    const b = new TestStringVO("xyz");
    expect(a.equals(b)).toBe(false);
  });

  it("should return the value from toString", () => {
    const vo = new TestStringVO("test");
    expect(vo.toString()).toBe("test");
  });
});
