import type { Departure } from "@/core/domain/shared/Departure";
import type { Translations } from "@/adapters/in/telegram/i18n";
import { lineNumberToEmoji, lineNumberToName } from "@/adapters/in/telegram/lineEmoji";

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
    const h = String(d.departureTime.hours).padStart(2, "0");
    const m = String(d.departureTime.minutes).padStart(2, "0");
    const time = `<b>${h}:${m}</b>`;
    const headsign = d.headsign ? ` → ${d.headsign}` : "";
    const lineName = lineNumberToName(d.lineName);
    return `${time} (${d.minutesRemaining} min) — ${lineNumberToEmoji(d.lineName)}<b>${lineName}</b>${headsign}`;
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
    const h = String(firstTomorrow.departureTime.hours).padStart(2, "0");
    const m = String(firstTomorrow.departureTime.minutes).padStart(2, "0");
    return `${header}${noMore}\n\n${t.firstTomorrow(`${h}:${m}`, firstTomorrow.lineName)}`;
  }

  return `${header}${noMore}`;
}
