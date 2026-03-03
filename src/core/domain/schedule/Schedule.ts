import type { ScheduleId } from "./ScheduleId.ts";
import type { Weekdays } from "./Weekdays.ts";
import type { DateRange } from "./DateRange.ts";
import type { ScheduleException } from "./ScheduleException.ts";

export class Schedule {
  constructor(
    readonly id: ScheduleId,
    readonly weekdays: Weekdays,
    readonly dateRange: DateRange,
    readonly exceptions: ScheduleException[],
  ) {}

  isActiveOn(date: Date): boolean {
    const dateString = this.toDateString(date);

    const exception = this.exceptions.find((e) => e.date === dateString);
    if (exception) {
      return exception.isServiceAdded();
    }

    if (!this.dateRange.contains(dateString)) {
      return false;
    }

    return this.weekdays.isActiveOnDay(date.getDay());
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  equals(other: Schedule): boolean {
    return this.id.equals(other.id);
  }
}
