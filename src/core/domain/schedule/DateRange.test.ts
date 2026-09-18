import { describe, it, expect } from "bun:test";
import { DateRange } from "./DateRange";
import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

describe("DateRange", () => {
  const range = new DateRange("2026-01-01", "2026-06-30");

  it("should create a valid date range", () => {
    expect(range.startDate).toBe("2026-01-01");
    expect(range.endDate).toBe("2026-06-30");
  });

  it("should accept same start and end date", () => {
    const singleDay = new DateRange("2026-03-03", "2026-03-03");
    expect(singleDay.startDate).toBe("2026-03-03");
    expect(singleDay.endDate).toBe("2026-03-03");
  });

  it("should reject start after end", () => {
    expect(() => new DateRange("2026-06-30", "2026-01-01")).toThrow(InvalidArgumentError);
  });

  it("should reject empty dates", () => {
    expect(() => new DateRange("", "2026-06-30")).toThrow(InvalidArgumentError);
    expect(() => new DateRange("2026-01-01", "")).toThrow(InvalidArgumentError);
  });

  it("should be equal when dates match", () => {
    const other = new DateRange("2026-01-01", "2026-06-30");
    expect(range.equals(other)).toBe(true);
  });

  it("should not be equal when dates differ", () => {
    const other = new DateRange("2026-01-01", "2026-12-31");
    expect(range.equals(other)).toBe(false);
  });
});
