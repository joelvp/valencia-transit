import { describe, it, expect } from "bun:test";
import { DateRange } from "./DateRange.ts";
import { InvalidArgumentError } from "../error/InvalidArgumentError.ts";

describe("DateRange", () => {
  const range = new DateRange("2026-01-01", "2026-06-30");

  it("should create a valid date range", () => {
    expect(range.startDate).toBe("2026-01-01");
    expect(range.endDate).toBe("2026-06-30");
  });

  it("should accept same start and end date", () => {
    const singleDay = new DateRange("2026-03-03", "2026-03-03");
    expect(singleDay.contains("2026-03-03")).toBe(true);
  });

  it("should reject start after end", () => {
    expect(() => new DateRange("2026-06-30", "2026-01-01")).toThrow(InvalidArgumentError);
  });

  it("should reject empty dates", () => {
    expect(() => new DateRange("", "2026-06-30")).toThrow(InvalidArgumentError);
    expect(() => new DateRange("2026-01-01", "")).toThrow(InvalidArgumentError);
  });

  it("should contain a date inside the range", () => {
    expect(range.contains("2026-03-15")).toBe(true);
  });

  it("should contain the exact start date", () => {
    expect(range.contains("2026-01-01")).toBe(true);
  });

  it("should contain the exact end date", () => {
    expect(range.contains("2026-06-30")).toBe(true);
  });

  it("should not contain a date before the range", () => {
    expect(range.contains("2025-12-31")).toBe(false);
  });

  it("should not contain a date after the range", () => {
    expect(range.contains("2026-07-01")).toBe(false);
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
