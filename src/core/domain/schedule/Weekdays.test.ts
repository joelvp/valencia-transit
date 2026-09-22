import { describe, it, expect } from "bun:test";
import { Weekdays } from "./Weekdays";

describe("Weekdays", () => {
  const weekdaysOnly = new Weekdays(true, true, true, true, true, false, false);
  const weekendOnly = new Weekdays(false, false, false, false, false, true, true);

  it("should be equal when all flags match", () => {
    const a = new Weekdays(true, true, true, true, true, false, false);
    const b = new Weekdays(true, true, true, true, true, false, false);
    expect(a.equals(b)).toBe(true);
  });

  it("should not be equal when flags differ", () => {
    expect(weekdaysOnly.equals(weekendOnly)).toBe(false);
  });
});
