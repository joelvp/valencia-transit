import { describe, it, expect } from "bun:test";
import { ScheduleMapper } from "./ScheduleMapper";
import { Schedule } from "@/core/domain/schedule/Schedule";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { Weekdays } from "@/core/domain/schedule/Weekdays";
import { DateRange } from "@/core/domain/schedule/DateRange";
import { ScheduleException } from "@/core/domain/schedule/ScheduleException";

describe("ScheduleMapper", () => {
  describe("toDomain", () => {
    it("should convert a DB row with multiple exceptions to a Schedule domain entity", () => {
      const row = {
        id: "schedule-1",
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      };
      const exceptionRows = [
        { scheduleId: "schedule-1", date: "2026-04-14", isActive: false },
        { scheduleId: "schedule-1", date: "2026-12-25", isActive: false },
        { scheduleId: "schedule-1", date: "2026-06-15", isActive: true },
      ];

      const schedule = ScheduleMapper.toDomain(row, exceptionRows);

      expect(schedule.id.value).toBe("schedule-1");
      expect(schedule.weekdays.monday).toBe(true);
      expect(schedule.weekdays.saturday).toBe(false);
      expect(schedule.weekdays.sunday).toBe(false);
      expect(schedule.dateRange.startDate).toBe("2026-01-01");
      expect(schedule.dateRange.endDate).toBe("2026-12-31");
      expect(schedule.exceptions).toHaveLength(3);
      expect(schedule.exceptions[0]!.date).toBe("2026-04-14");
      expect(schedule.exceptions[0]!.isActive).toBe(false);
      expect(schedule.exceptions[2]!.date).toBe("2026-06-15");
      expect(schedule.exceptions[2]!.isActive).toBe(true);
    });

    it("should handle empty exceptions array", () => {
      const row = {
        id: "schedule-1",
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      };

      const schedule = ScheduleMapper.toDomain(row, []);

      expect(schedule.exceptions).toHaveLength(0);
    });

    it("should return a Schedule instance", () => {
      const row = {
        id: "schedule-1",
        monday: true,
        tuesday: false,
        wednesday: true,
        thursday: false,
        friday: true,
        saturday: true,
        sunday: true,
        startDate: "2026-01-01",
        endDate: "2026-06-30",
      };

      const schedule = ScheduleMapper.toDomain(row, []);

      expect(schedule).toBeInstanceOf(Schedule);
    });

    it("should map all weekday booleans correctly", () => {
      const row = {
        id: "schedule-weekend",
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: true,
        sunday: true,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      };

      const schedule = ScheduleMapper.toDomain(row, []);

      expect(schedule.weekdays.monday).toBe(false);
      expect(schedule.weekdays.tuesday).toBe(false);
      expect(schedule.weekdays.wednesday).toBe(false);
      expect(schedule.weekdays.thursday).toBe(false);
      expect(schedule.weekdays.friday).toBe(false);
      expect(schedule.weekdays.saturday).toBe(true);
      expect(schedule.weekdays.sunday).toBe(true);
    });
  });

  describe("toPersistence", () => {
    it("should convert a Schedule domain entity to schedule and scheduleException rows", () => {
      const weekdays = new Weekdays(true, true, true, true, true, false, false);
      const dateRange = new DateRange("2026-01-01", "2026-12-31");
      const exceptions = [
        new ScheduleException("2026-04-14", false),
        new ScheduleException("2026-12-25", false),
      ];
      const schedule = new Schedule(
        new ScheduleId("schedule-1"),
        weekdays,
        dateRange,
        exceptions,
      );

      const result = ScheduleMapper.toPersistence(schedule, "metrovalencia");

      expect(result.schedule.id).toBe("schedule-1");
      expect(result.schedule.feedId).toBe("metrovalencia");
      expect(result.schedule.monday).toBe(true);
      expect(result.schedule.tuesday).toBe(true);
      expect(result.schedule.wednesday).toBe(true);
      expect(result.schedule.thursday).toBe(true);
      expect(result.schedule.friday).toBe(true);
      expect(result.schedule.saturday).toBe(false);
      expect(result.schedule.sunday).toBe(false);
      expect(result.schedule.startDate).toBe("2026-01-01");
      expect(result.schedule.endDate).toBe("2026-12-31");

      expect(result.scheduleExceptions).toHaveLength(2);
      expect(result.scheduleExceptions[0]!.scheduleId).toBe("schedule-1");
      expect(result.scheduleExceptions[0]!.feedId).toBe("metrovalencia");
      expect(result.scheduleExceptions[0]!.date).toBe("2026-04-14");
      expect(result.scheduleExceptions[0]!.isActive).toBe(false);
      expect(result.scheduleExceptions[1]!.date).toBe("2026-12-25");
    });

    it("should produce empty scheduleExceptions array when schedule has no exceptions", () => {
      const weekdays = new Weekdays(true, true, true, true, true, false, false);
      const dateRange = new DateRange("2026-01-01", "2026-12-31");
      const schedule = new Schedule(new ScheduleId("schedule-1"), weekdays, dateRange, []);

      const result = ScheduleMapper.toPersistence(schedule, "metrovalencia");

      expect(result.scheduleExceptions).toHaveLength(0);
    });
  });

  describe("round-trip", () => {
    it("should produce an equivalent entity after toPersistence and toDomain", () => {
      const weekdays = new Weekdays(true, true, true, true, true, false, false);
      const dateRange = new DateRange("2026-01-01", "2026-12-31");
      const exceptions = [
        new ScheduleException("2026-04-14", false),
        new ScheduleException("2026-06-15", true),
      ];
      const original = new Schedule(
        new ScheduleId("schedule-1"),
        weekdays,
        dateRange,
        exceptions,
      );

      const { schedule: scheduleRow, scheduleExceptions: exceptionRows } =
        ScheduleMapper.toPersistence(original, "metrovalencia");
      const restored = ScheduleMapper.toDomain(scheduleRow, exceptionRows);

      expect(restored.id.value).toBe(original.id.value);
      expect(restored.weekdays.monday).toBe(original.weekdays.monday);
      expect(restored.weekdays.saturday).toBe(original.weekdays.saturday);
      expect(restored.weekdays.sunday).toBe(original.weekdays.sunday);
      expect(restored.dateRange.startDate).toBe(original.dateRange.startDate);
      expect(restored.dateRange.endDate).toBe(original.dateRange.endDate);
      expect(restored.exceptions).toHaveLength(original.exceptions.length);
      expect(restored.exceptions[0]!.date).toBe(original.exceptions[0]!.date);
      expect(restored.exceptions[0]!.isActive).toBe(original.exceptions[0]!.isActive);
      expect(restored.exceptions[1]!.date).toBe(original.exceptions[1]!.date);
      expect(restored.exceptions[1]!.isActive).toBe(original.exceptions[1]!.isActive);
    });
  });
});
