import { describe, it, expect } from "bun:test";
import { Schedule } from "./Schedule";
import { ScheduleId } from "./ScheduleId";
import { Weekdays } from "./Weekdays";
import { DateRange } from "./DateRange";
import { ScheduleException } from "./ScheduleException";

function createSchedule(opts?: {
  weekdays?: Weekdays;
  dateRange?: DateRange;
  exceptions?: ScheduleException[];
}): Schedule {
  return new Schedule(
    new ScheduleId("SCH1"),
    opts?.weekdays ?? new Weekdays(true, true, true, true, true, false, false),
    opts?.dateRange ?? new DateRange("2026-01-01", "2026-12-31"),
    opts?.exceptions ?? [],
  );
}

describe("Schedule", () => {
  describe("ScheduleException", () => {
    it("isServiceRemoved() should return true when isActive is false", () => {
      const exception = new ScheduleException("2026-03-07", false);
      expect(exception.isServiceRemoved()).toBe(true);
    });

    it("isServiceRemoved() should return false when isActive is true", () => {
      const exception = new ScheduleException("2026-03-07", true);
      expect(exception.isServiceRemoved()).toBe(false);
    });
  });

  describe("equals", () => {
    it("should be equal to another schedule with the same id", () => {
      const a = createSchedule();
      const b = new Schedule(
        new ScheduleId("SCH1"),
        new Weekdays(false, false, false, false, false, true, true),
        new DateRange("2020-01-01", "2020-12-31"),
        [],
      );
      expect(a.equals(b)).toBe(true);
    });

    it("should not be equal to a schedule with a different id", () => {
      const a = createSchedule();
      const b = new Schedule(new ScheduleId("SCH2"), a.weekdays, a.dateRange, []);
      expect(a.equals(b)).toBe(false);
    });
  });
});
