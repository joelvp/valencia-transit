import type { Departure } from "@/core/domain/shared/Departure";
import type { Translations } from "@/adapters/in/telegram/i18n";
import {
  lineNumberToEmoji,
  lineNumberToName,
  lineNumberToHeaderEmoji,
} from "@/adapters/in/telegram/lineEmoji";

function formatTime(hours: number, minutes: number): string {
  const h = String(hours % 24).padStart(2, "0");
  const m = String(minutes).padStart(2, "0");
  return `${h}:${m}`;
}

function formatWait(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function formatHeader(
  origin: string,
  destination: string,
  routeLineName: string | null,
  durationMinutes?: number | null,
): string {
  const emoji = lineNumberToHeaderEmoji(routeLineName);
  const duration = durationMinutes != null ? `  (~${durationMinutes} min)` : "";
  return `${emoji} <b>${origin} → ${destination}</b>${duration}`;
}

export function formatDepartures(
  t: Translations,
  origin: string,
  destination: string,
  departures: Departure[],
  firstTomorrow: Departure | null = null,
  routeLineName: string | null = null,
): string {
  const header = formatHeader(origin, destination, routeLineName, departures[0]?.durationMinutes);
  const lines = departures.map((d) => {
    const time = `<b>${formatTime(d.departureTime.hours, d.departureTime.minutes)}</b>`;
    const headsign = d.headsign ? ` → ${d.headsign}` : "";
    const lineInfo = d.lineName
      ? ` — ${lineNumberToEmoji(d.lineName)}<b>${lineNumberToName(d.lineName)}</b>`
      : "";
    return `${time} (${formatWait(d.minutesRemaining)})${lineInfo}${headsign}`;
  });

  const tomorrowLine = firstTomorrow
    ? [
        t.firstTomorrow(
          formatTime(firstTomorrow.departureTime.hours, firstTomorrow.departureTime.minutes),
        ),
      ]
    : [];

  return [
    header,
    "",
    t.nextDepartures,
    ...lines,
    ...(tomorrowLine.length ? ["", ...tomorrowLine] : []),
    "",
    t.disclaimer,
  ].join("\n");
}

export function formatNoMoreToday(
  t: Translations,
  origin: string,
  destination: string,
  firstTomorrow: Departure | null,
  routeLineName: string | null = null,
): string {
  const header = formatHeader(origin, destination, routeLineName);
  const noMore = `\n${t.noMoreToday(origin, destination)}`;

  if (firstTomorrow) {
    const time = formatTime(firstTomorrow.departureTime.hours, firstTomorrow.departureTime.minutes);
    return `${header}${noMore}\n\n${t.firstTomorrow(time)}`;
  }

  return `${header}${noMore}`;
}
