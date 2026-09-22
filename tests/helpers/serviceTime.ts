import { ServiceCalendar } from "@/core/domain/shared/ServiceCalendar";

/**
 * Use when a test's `Date` will pass through ServiceCalendar (SearchNextDepartures' `now`,
 * seeding "today" for schedule_exceptions) — never hand-compute a UTC offset instead.
 * A plain `new Date()`/ISO string is still fine for timestamps nothing re-interprets
 * (occurredOn, createdAt...). Ambiguous/skipped during the ~1h yearly DST changeover —
 * no fixture here needs that window.
 */
export function serviceInstant(dateStr: string, timeStr: string, timeZone = "Europe/Madrid"): Date {
  const calendar = new ServiceCalendar(timeZone);
  const guess = new Date(`${dateStr}T${timeStr}Z`); // read the wanted wall-clock reading as if it were UTC
  const guessedAsZoned = new Date(
    `${calendar.serviceDateOf(guess).value}T${calendar.timeOfDayOf(guess).value}Z`,
  );
  const offsetMs = guessedAsZoned.getTime() - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
}
