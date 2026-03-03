import { describe, it, expect } from "bun:test";
import { TimeOfDay } from "./TimeOfDay.ts";
import { InvalidArgumentError } from "../error/InvalidArgumentError.ts";

describe("TimeOfDay", () => {
  it("should parse a valid time", () => {
    const time = new TimeOfDay("14:30:00");
    expect(time.hours).toBe(14);
    expect(time.minutes).toBe(30);
    expect(time.seconds).toBe(0);
    expect(time.value).toBe("14:30:00");
  });

  it("should accept midnight", () => {
    const time = new TimeOfDay("0:00:00");
    expect(time.hours).toBe(0);
    expect(time.minutes).toBe(0);
    expect(time.seconds).toBe(0);
  });

  it("should accept GTFS next-day times (>24:00:00)", () => {
    const time = new TimeOfDay("25:30:00");
    expect(time.hours).toBe(25);
    expect(time.minutes).toBe(30);
    expect(time.seconds).toBe(0);
  });

  it("should accept times up to 48 hours (GTFS edge case)", () => {
    expect(() => new TimeOfDay("47:59:59")).not.toThrow();
  });

  it("should reject invalid format", () => {
    expect(() => new TimeOfDay("")).toThrow(InvalidArgumentError);
    expect(() => new TimeOfDay("14:30")).toThrow(InvalidArgumentError);
    expect(() => new TimeOfDay("abc")).toThrow(InvalidArgumentError);
    expect(() => new TimeOfDay("14:30:00:00")).toThrow(InvalidArgumentError);
  });

  it("should reject invalid minutes", () => {
    expect(() => new TimeOfDay("14:60:00")).toThrow(InvalidArgumentError);
  });

  it("should reject invalid seconds", () => {
    expect(() => new TimeOfDay("14:30:60")).toThrow(InvalidArgumentError);
  });

  describe("isAfter", () => {
    it("should return true when time is after", () => {
      const a = new TimeOfDay("14:30:00");
      const b = new TimeOfDay("14:00:00");
      expect(a.isAfter(b)).toBe(true);
    });

    it("should return false when time is before", () => {
      const a = new TimeOfDay("14:00:00");
      const b = new TimeOfDay("14:30:00");
      expect(a.isAfter(b)).toBe(false);
    });

    it("should return false when times are equal", () => {
      const a = new TimeOfDay("14:30:00");
      const b = new TimeOfDay("14:30:00");
      expect(a.isAfter(b)).toBe(false);
    });
  });

  describe("isBefore", () => {
    it("should return true when time is before", () => {
      const a = new TimeOfDay("14:00:00");
      const b = new TimeOfDay("14:30:00");
      expect(a.isBefore(b)).toBe(true);
    });

    it("should return false when time is after", () => {
      const a = new TimeOfDay("14:30:00");
      const b = new TimeOfDay("14:00:00");
      expect(a.isBefore(b)).toBe(false);
    });
  });

  describe("minutesUntilFrom", () => {
    it("should calculate positive minutes", () => {
      const departure = new TimeOfDay("14:30:00");
      const now = new TimeOfDay("14:00:00");
      expect(departure.minutesUntilFrom(now)).toBe(30);
    });

    it("should calculate negative minutes when in the past", () => {
      const departure = new TimeOfDay("14:00:00");
      const now = new TimeOfDay("14:30:00");
      expect(departure.minutesUntilFrom(now)).toBe(-30);
    });

    it("should return zero for same time", () => {
      const time = new TimeOfDay("14:30:00");
      expect(time.minutesUntilFrom(time)).toBe(0);
    });

    it("should floor partial minutes", () => {
      const departure = new TimeOfDay("14:30:45");
      const now = new TimeOfDay("14:30:00");
      expect(departure.minutesUntilFrom(now)).toBe(0); // 45 seconds < 1 minute
    });

    it("should handle GTFS next-day times", () => {
      const departure = new TimeOfDay("25:30:00");
      const now = new TimeOfDay("23:30:00");
      expect(departure.minutesUntilFrom(now)).toBe(120); // 2 hours
    });
  });

  describe("equals", () => {
    it("should be equal when values match", () => {
      const a = new TimeOfDay("14:30:00");
      const b = new TimeOfDay("14:30:00");
      expect(a.equals(b)).toBe(true);
    });

    it("should not be equal when values differ", () => {
      const a = new TimeOfDay("14:30:00");
      const b = new TimeOfDay("14:31:00");
      expect(a.equals(b)).toBe(false);
    });
  });
});
