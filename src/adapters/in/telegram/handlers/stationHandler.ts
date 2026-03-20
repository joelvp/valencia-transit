import type { Context } from "grammy";
import type {
  ListStationsWithLines,
  StationWithLines,
} from "@/core/application/query/ListStationsWithLines";

export function stationHandler(useCase: ListStationsWithLines) {
  return async (ctx: Context): Promise<void> => {
    const result = await useCase.execute();
    await ctx.reply(formatStations(result));
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

function formatStations(stationsWithLines: StationWithLines[]): string {
  if (stationsWithLines.length === 0) {
    return "ℹ️ No stations available.";
  }

  const lines = stationsWithLines.map(({ station, lines }) => {
    const lineLabels = lines
      .map((l) => `${hexToLineEmoji(l.color?.value ?? null)}${l.name.value}`)
      .join(" ");
    return lineLabels ? `${station.name.value} — ${lineLabels}` : station.name.value;
  });

  return ["🚉 Available stations:", "", ...lines].join("\n");
}
