import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * A GTFS service day: the civil calendar day a timetable belongs to, in the
 * feed's own timezone. Trips running past midnight (24:xx and later) still
 * belong to the service date their run started on.
 *
 * Resolving an instant into a ServiceDate needs a timezone — that is
 * {@link ServiceCalendar}'s job. Once resolved, moving between adjacent days is
 * plain calendar arithmetic and needs no timezone at all.
 */
export class ServiceDate {
  constructor(readonly value: string) {
    if (!DATE_PATTERN.test(value)) {
      throw new InvalidArgumentError(`ServiceDate must be in YYYY-MM-DD format, got "${value}"`);
    }
  }

  previous(): ServiceDate {
    return this.shiftedBy(-1);
  }

  next(): ServiceDate {
    return this.shiftedBy(1);
  }

  equals(other: ServiceDate): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  private shiftedBy(days: number): ServiceDate {
    const [, year, month, day] = DATE_PATTERN.exec(this.value)!;
    // UTC has no DST, so day arithmetic here is always exactly 24h
    const shifted = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)) + days * MS_PER_DAY,
    );
    const pad = (n: number) => String(n).padStart(2, "0");
    return new ServiceDate(
      `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    );
  }
}
