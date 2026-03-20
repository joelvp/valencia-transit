import type { Context } from "grammy";
import type {
  ListStationsWithLines,
  StationWithLines,
} from "@/core/application/query/ListStationsWithLines";
import type { Translations } from "@/adapters/in/telegram/i18n";
import { getT } from "@/adapters/in/telegram/languageStore";

export function stationHandler(useCase: ListStationsWithLines) {
  return async (ctx: Context): Promise<void> => {
    const t = getT(ctx.chat?.id ?? 0);
    const result = await useCase.execute();
    await ctx.reply(formatStations(t, result), { parse_mode: "HTML" });
  };
}

function hexToLineEmoji(hex: string | null): string {
  if (!hex) return "⚪";
  const map: Record<string, string> = {
    DA291C: "🔴",
    FFD100: "🟡",
    ED1C24: "🔴",
    "00A650": "🟢",
    "0072CE": "🔵",
    "8B4513": "🟤",
    "800080": "🟣",
    FFA500: "🟠",
  };
  return map[hex] ?? "⚪";
}

function formatStations(t: Translations, stationsWithLines: StationWithLines[]): string {
  if (stationsWithLines.length === 0) {
    return t.noStations;
  }

  const lines = stationsWithLines.map(({ station, lines }) => {
    const lineLabels = lines
      .map((l) => `${hexToLineEmoji(l.color?.value ?? null)}${l.name.value}`)
      .join(" ");
    return lineLabels ? `${station.name.value} — ${lineLabels}` : station.name.value;
  });

  return [t.stationsHeader, "", ...lines].join("\n");
}
