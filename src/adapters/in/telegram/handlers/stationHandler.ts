import type { Context } from "grammy";
import type { ListStationsWithLines } from "@/core/application/query/ListStationsWithLines";
import { getT } from "@/adapters/in/telegram/languageStore";

const CHUNK_SIZE = 50;

export function stationHandler(useCase: ListStationsWithLines) {
  return async (ctx: Context): Promise<void> => {
    const t = getT(ctx.chat?.id ?? 0);
    const result = await useCase.execute();

    if (result.length === 0) {
      await ctx.reply(t.noStations, { parse_mode: "HTML" });
      return;
    }

    const lines = result.map(({ station, lines }) => {
      const lineLabels = lines
        .map((l) => `${hexToLineEmoji(l.color?.value ?? null)}${l.name.value}`)
        .join(" ");
      return lineLabels ? `${station.name.value} — ${lineLabels}` : station.name.value;
    });

    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const chunk = lines.slice(i, i + CHUNK_SIZE);
      const header = i === 0 ? [t.stationsHeader, ""] : [];
      await ctx.reply([...header, ...chunk].join("\n"), { parse_mode: "HTML" });
    }
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

