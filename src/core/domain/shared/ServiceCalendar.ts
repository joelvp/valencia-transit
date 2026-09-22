import { ServiceDate } from "./ServiceDate";
import { TimeOfDay } from "./TimeOfDay";

/**
 * The single place that turns a real instant into the feed's civil time.
 *
 * Every civil date or time-of-day in the app must come from here: reading them
 * off a Date directly uses either UTC (`toISOString`) or the server's own
 * timezone (`getDate`, `getHours`), and both are wrong for the hours between
 * the feed's midnight and UTC's — a window that lands exactly on the last
 * trains of the night.
 */
export class ServiceCalendar {
  constructor(private readonly timezone: string) {}

  serviceDateOf(instant: Date): ServiceDate {
    const parts = this.partsOf(instant, { year: "numeric", month: "2-digit", day: "2-digit" });
    return new ServiceDate(`${parts["year"]}-${parts["month"]}-${parts["day"]}`);
  }

  timeOfDayOf(instant: Date): TimeOfDay {
    const parts = this.partsOf(instant, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return new TimeOfDay(`${parts["hour"]}:${parts["minute"]}:${parts["second"]}`);
  }

  private partsOf(instant: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone: this.timezone,
      ...options,
    }).formatToParts(instant);

    const parts: Record<string, string> = {};
    for (const part of formatted) {
      parts[part.type] = part.value;
    }
    return parts;
  }
}
