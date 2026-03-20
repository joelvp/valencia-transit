import type { Context } from "grammy";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import type { Departure } from "@/core/domain/shared/Departure";

export function callbackHandler(useCase: SearchNextDepartures) {
  return async (ctx: Context): Promise<void> => {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const parsed = parseCallbackData(data);
    if (!parsed) {
      await ctx.answerCallbackQuery({ text: "Datos inválidos" });
      return;
    }

    const { originName, destinationName } = parsed;

    try {
      const result = await useCase.execute(originName, destinationName, new Date());

      if (result.type === "disambiguation") {
        await ctx.answerCallbackQuery({ text: "Aún hay ambigüedad" });
        return;
      }

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        formatDepartures(
          result.data.origin.name.value,
          result.data.destination.name.value,
          result.data.departures,
        ),
        { parse_mode: "HTML" },
      );
    } catch {
      await ctx.answerCallbackQuery({ text: "Error al buscar salidas" });
    }
  };
}

function parseCallbackData(data: string): { originName: string; destinationName: string } | null {
  // Format: d|o|StationName|OtherName or d|d|OtherName|StationName
  const parts = data.split("|");
  if (parts.length !== 4 || parts[0] !== "d") return null;

  const field = parts[1];
  if (field === "o") {
    return { originName: parts[2]!, destinationName: parts[3]! };
  } else if (field === "d") {
    return { originName: parts[2]!, destinationName: parts[3]! };
  }

  return null;
}

function formatDepartures(origin: string, destination: string, departures: Departure[]): string {
  const header = `🚇 <b>${origin} → ${destination}</b>`;
  const lines = departures.map((d, i) => {
    const h = String(d.departureTime.hours).padStart(2, "0");
    const m = String(d.departureTime.minutes).padStart(2, "0");
    const time = `<b>${h}:${m}</b>`;
    const headsign = d.headsign ? ` → ${d.headsign}` : "";
    return `${i + 1}. ${time} (${d.minutesRemaining} min) — <b>${d.lineName}</b>${headsign}`;
  });

  return [
    header,
    "",
    "Próximas salidas:",
    ...lines,
    "",
    "ℹ️ Horarios planificados. Los tiempos reales pueden variar.",
  ].join("\n");
}
