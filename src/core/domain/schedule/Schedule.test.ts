import { describe, it, expect } from "bun:test";
import { Schedule } from "./Schedule.ts";
import { ScheduleId } from "./ScheduleId.ts";
import { Weekdays } from "./Weekdays.ts";
import { DateRange } from "./DateRange.ts";
import { ScheduleException } from "./ScheduleException.ts";

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
  describe("isActiveOn", () => {
    it("should return true for a weekday within date range", () => {
      const schedule = createSchedule();
      // 2026-03-02 is a Monday
      expect(schedule.isActiveOn(new Date(2026, 2, 2))).toBe(true);
    });

    it("should return false for a weekend day (weekday-only schedule)", () => {
      const schedule = createSchedule();
      // 2026-03-07 is a Saturday
      expect(schedule.isActiveOn(new Date(2026, 2, 7))).toBe(false);
    });

    it("should return false for a date outside the date range", () => {
      const schedule = createSchedule();
      // 2027-01-05 is a Monday but outside range
      expect(schedule.isActiveOn(new Date(2027, 0, 5))).toBe(false);
    });

    it("should return true on start date boundary", () => {
      const schedule = createSchedule({
        dateRange: new DateRange("2026-03-05", "2026-03-05"),
        weekdays: new Weekdays(true, true, true, true, true, true, true),
      });
      expect(schedule.isActiveOn(new Date(2026, 2, 5))).toBe(true);
    });

    it("should return true when exception adds service on a normally inactive day", () => {
      const schedule = createSchedule({
        exceptions: [new ScheduleException("2026-03-07", true)],
      });
      // Saturday normally inactive, but exception adds service
      expect(schedule.isActiveOn(new Date(2026, 2, 7))).toBe(true);
    });

    it("should return false when exception removes service on a normally active day", () => {
      const schedule = createSchedule({
        exceptions: [new ScheduleException("2026-03-02", false)],
      });
      // Monday normally active, but exception removes service
      expect(schedule.isActiveOn(new Date(2026, 2, 2))).toBe(false);
    });

    it("should prioritize exception over weekday and date range rules", () => {
      const schedule = createSchedule({
        dateRange: new DateRange("2026-01-01", "2026-06-30"),
        exceptions: [new ScheduleException("2026-08-01", true)],
      });
      // 2026-08-01 is outside date range but exception adds service
      expect(schedule.isActiveOn(new Date(2026, 7, 1))).toBe(true);
    });

    it("should return true for a weekend schedule on Saturday", () => {
      const weekendOnly = new Weekdays(false, false, false, false, false, true, true);
      const schedule = createSchedule({ weekdays: weekendOnly });
      // 2026-03-07 is Saturday
      expect(schedule.isActiveOn(new Date(2026, 2, 7))).toBe(true);
    });

    it("should return false for an all-days schedule outside date range", () => {
      const allDays = new Weekdays(true, true, true, true, true, true, true);
      const schedule = createSchedule({
        weekdays: allDays,
        dateRange: new DateRange("2026-06-01", "2026-06-30"),
      });
      expect(schedule.isActiveOn(new Date(2026, 2, 2))).toBe(false);
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
      const b = new Schedule(
        new ScheduleId("SCH2"),
        a.weekdays,
        a.dateRange,
        [],
      );
      expect(a.equals(b)).toBe(false);
    });
  });
});
