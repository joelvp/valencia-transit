import type { ScheduleId } from "./ScheduleId";
import type { Weekdays } from "./Weekdays";
import type { DateRange } from "./DateRange";
import type { ScheduleException } from "./ScheduleException";

export class Schedule {
  constructor(
    readonly id: ScheduleId,
    readonly weekdays: Weekdays,
    readonly dateRange: DateRange,
    readonly exceptions: ScheduleException[],
  ) {}

  equals(other: Schedule): boolean {
    return this.id.equals(other.id);
  }
}
