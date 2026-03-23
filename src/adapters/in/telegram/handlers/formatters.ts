import type { Departure } from "@/core/domain/shared/Departure";
import type { Translations } from "@/adapters/in/telegram/i18n";
import { lineNumberToEmoji, lineNumberToName } from "@/adapters/in/telegram/lineEmoji";

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

export function formatDepartures(
  t: Translations,
  origin: string,
  destination: string,
  departures: Departure[],
): string {
  const durationSuffix =
    departures[0]?.durationMinutes != null ? `  (~${departures[0].durationMinutes} min)` : "";
  const header = `🚇 <b>${origin} → ${destination}</b>${durationSuffix}`;
  const lines = departures.map((d) => {
    const time = `<b>${formatTime(d.departureTime.hours, d.departureTime.minutes)}</b>`;
    const headsign = d.headsign ? ` → ${d.headsign}` : "";
    const lineName = lineNumberToName(d.lineName);
    return `${time} (${formatWait(d.minutesRemaining)}) — ${lineNumberToEmoji(d.lineName)}<b>${lineName}</b>${headsign}`;
  });

  return [header, "", t.nextDepartures, ...lines, "", t.disclaimer].join("\n");
}

export function formatNoMoreToday(
  t: Translations,
  origin: string,
  destination: string,
  firstTomorrow: Departure | null,
): string {
  const header = `🚇 <b>${origin} → ${destination}</b>`;
  const noMore = `\n${t.noMoreToday(origin, destination)}`;

  if (firstTomorrow) {
    const time = formatTime(firstTomorrow.departureTime.hours, firstTomorrow.departureTime.minutes);
    return `${header}${noMore}\n\n${t.firstTomorrow(time, firstTomorrow.lineName)}`;
  }

  return `${header}${noMore}`;
}
