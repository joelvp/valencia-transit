import { InvalidArgumentError } from "../error/InvalidArgumentError.ts";

export class DateRange {
  constructor(
    readonly startDate: string,
    readonly endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new InvalidArgumentError("DateRange requires both startDate and endDate");
    }
    if (startDate > endDate) {
      throw new InvalidArgumentError(
        `DateRange startDate (${startDate}) cannot be after endDate (${endDate})`,
      );
    }
  }

  contains(date: string): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  equals(other: DateRange): boolean {
    return this.startDate === other.startDate && this.endDate === other.endDate;
  }
}
