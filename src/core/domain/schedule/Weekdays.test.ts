import { describe, it, expect } from "bun:test";
import { Weekdays } from "./Weekdays.ts";

describe("Weekdays", () => {
  const weekdaysOnly = new Weekdays(true, true, true, true, true, false, false);
  const weekendOnly = new Weekdays(false, false, false, false, false, true, true);
  const allActive = new Weekdays(true, true, true, true, true, true, true);
  const noneActive = new Weekdays(false, false, false, false, false, false, false);

  it("should be active on weekdays for weekday schedule", () => {
    expect(weekdaysOnly.isActiveOnDay(1)).toBe(true); // Monday
    expect(weekdaysOnly.isActiveOnDay(2)).toBe(true); // Tuesday
    expect(weekdaysOnly.isActiveOnDay(3)).toBe(true); // Wednesday
    expect(weekdaysOnly.isActiveOnDay(4)).toBe(true); // Thursday
    expect(weekdaysOnly.isActiveOnDay(5)).toBe(true); // Friday
  });

  it("should be inactive on weekends for weekday schedule", () => {
    expect(weekdaysOnly.isActiveOnDay(6)).toBe(false); // Saturday
    expect(weekdaysOnly.isActiveOnDay(0)).toBe(false); // Sunday
  });

  it("should be active on weekends for weekend schedule", () => {
    expect(weekendOnly.isActiveOnDay(6)).toBe(true); // Saturday
    expect(weekendOnly.isActiveOnDay(0)).toBe(true); // Sunday
  });

  it("should be inactive on weekdays for weekend schedule", () => {
    expect(weekendOnly.isActiveOnDay(1)).toBe(false); // Monday
    expect(weekendOnly.isActiveOnDay(5)).toBe(false); // Friday
  });

  it("should be active every day when all days active", () => {
    for (let day = 0; day <= 6; day++) {
      expect(allActive.isActiveOnDay(day)).toBe(true);
    }
  });

  it("should be inactive every day when no days active", () => {
    for (let day = 0; day <= 6; day++) {
      expect(noneActive.isActiveOnDay(day)).toBe(false);
    }
  });

  it("should return false for out-of-range day", () => {
    expect(allActive.isActiveOnDay(7)).toBe(false);
    expect(allActive.isActiveOnDay(-1)).toBe(false);
  });

  it("should be equal when all flags match", () => {
    const a = new Weekdays(true, true, true, true, true, false, false);
    const b = new Weekdays(true, true, true, true, true, false, false);
    expect(a.equals(b)).toBe(true);
  });

  it("should not be equal when flags differ", () => {
    expect(weekdaysOnly.equals(weekendOnly)).toBe(false);
  });
});
