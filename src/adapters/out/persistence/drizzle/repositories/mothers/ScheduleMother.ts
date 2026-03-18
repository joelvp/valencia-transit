import { Schedule } from "@/core/domain/schedule/Schedule";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { Weekdays } from "@/core/domain/schedule/Weekdays";
import { DateRange } from "@/core/domain/schedule/DateRange";

type ScheduleRow = {
  id: string;
  feedId: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  startDate: string;
  endDate: string;
};

const WEEKDAY_DEFAULTS: Omit<ScheduleRow, "id" | "feedId"> = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
  startDate: "2025-01-01",
  endDate: "2025-12-31",
};

export class ScheduleMother {
  static create(overrides: Partial<{ id: string }> = {}): Schedule {
    return new Schedule(
      new ScheduleId(overrides.id ?? "SC1"),
      new Weekdays(true, true, true, true, true, false, false),
      new DateRange("2025-01-01", "2025-12-31"),
      [],
    );
  }

  /** Mon–Fri schedule (default) */
  static row(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
    return { id: "SC1", feedId: "metrovalencia", ...WEEKDAY_DEFAULTS, ...overrides };
  }

  /** Sat–Sun schedule */
  static weekendRow(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
    return {
      id: "SC2",
      feedId: "metrovalencia",
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: true,
      sunday: true,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      ...overrides,
    };
  }
}
