import { describe, it, expect } from "bun:test";
import { ScheduleException } from "./ScheduleException";

describe("ScheduleException", () => {
  it("should report service as added when isActive is true", () => {
    const exception = new ScheduleException("2026-03-29", true);
    expect(exception.isServiceAdded()).toBe(true);
    expect(exception.isServiceRemoved()).toBe(false);
  });

  it("should report service as removed when isActive is false", () => {
    const exception = new ScheduleException("2026-03-29", false);
    expect(exception.isServiceRemoved()).toBe(true);
    expect(exception.isServiceAdded()).toBe(false);
  });

  it("should be equal to another ScheduleException with the same date and isActive", () => {
    const a = new ScheduleException("2026-03-29", true);
    const b = new ScheduleException("2026-03-29", true);
    expect(a.equals(b)).toBe(true);
  });

  it("should not be equal when dates differ", () => {
    const a = new ScheduleException("2026-03-29", true);
    const b = new ScheduleException("2026-03-30", true);
    expect(a.equals(b)).toBe(false);
  });

  it("should not be equal when isActive differs", () => {
    const a = new ScheduleException("2026-03-29", true);
    const b = new ScheduleException("2026-03-29", false);
    expect(a.equals(b)).toBe(false);
  });

  it("should not be equal when both date and isActive differ", () => {
    const a = new ScheduleException("2026-03-29", true);
    const b = new ScheduleException("2026-03-30", false);
    expect(a.equals(b)).toBe(false);
  });
});
