import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import type { Departure } from "@/core/domain/shared/Departure";
import type { Station } from "@/core/domain/station/Station";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { NoConnectionError } from "@/core/domain/error/NoConnectionError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";

export function departureHandler(useCase: SearchNextDepartures) {
  return async (ctx: Context): Promise<void> => {
    const text = ctx.message?.text ?? "";
    const args = text.trim().replace(/^\/\S+\s*/, "");

    if (!args) {
      await ctx.reply("⚠️ Uso: /salida &lt;origen&gt; - &lt;destino&gt;", { parse_mode: "HTML" });
      return;
    }

    const parsed = parseStations(args);
    if (!parsed) {
      await ctx.reply("⚠️ Uso: /salida &lt;origen&gt; - &lt;destino&gt;", { parse_mode: "HTML" });
      return;
    }

    const { originName, destinationName } = parsed;

    try {
      const result = await useCase.execute(originName, destinationName, new Date());

      if (result.type === "disambiguation") {
        await ctx.reply(formatDisambiguation(result.field, result.candidates), {
          parse_mode: "HTML",
          reply_markup: buildDisambiguationKeyboard(
            result.field,
            result.candidates,
            result.otherName,
          ),
        });
        return;
      }

      if (result.type === "no_more_today") {
        await ctx.reply(
          formatNoMoreToday(
            result.origin.name.value,
            result.destination.name.value,
            result.firstTomorrow,
          ),
          { parse_mode: "HTML" },
        );
        return;
      }

      await ctx.reply(
        formatDepartures(
          result.data.origin.name.value,
          result.data.destination.name.value,
          result.data.departures,
        ),
        { parse_mode: "HTML" },
      );
    } catch (err) {
      if (err instanceof StationNotFoundError) {
        const match = /^Station not found: "(.+)"$/.exec(err.message);
        const stationName = match ? match[1] : "unknown";
        await ctx.reply(`❌ Estación no encontrada: ${stationName}`);
      } else if (err instanceof NoConnectionError) {
        await ctx.reply(`❌ No hay conexión entre ${originName} y ${destinationName}`);
      } else if (err instanceof NoActiveServiceError) {
        await ctx.reply("❌ No hay servicio activo en este momento");
      } else {
        await ctx.reply("❌ Error inesperado. Inténtalo de nuevo más tarde.");
      }
    }
  };
}

function parseStations(args: string): { originName: string; destinationName: string } | null {
  // Try " - " separator: "Àngel Guimerà - Colón"
  const dashMatch = /^(.+?)\s+-\s+(.+)$/.exec(args);
  if (dashMatch) return { originName: dashMatch[1]!.trim(), destinationName: dashMatch[2]!.trim() };

  // Try " a " separator: "Àngel Guimerà a Colón"
  const aMatch = /^(.+?)\sa\s(.+)$/.exec(args);
  if (aMatch) return { originName: aMatch[1]!.trim(), destinationName: aMatch[2]!.trim() };

  // Fallback: first word = origin, rest = destination
  const spaceIdx = args.indexOf(" ");
  if (spaceIdx === -1) return null;
  return { originName: args.slice(0, spaceIdx), destinationName: args.slice(spaceIdx + 1) };
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

function formatNoMoreToday(
  origin: string,
  destination: string,
  firstTomorrow: Departure | null,
): string {
  const header = `🚇 <b>${origin} → ${destination}</b>`;
  const noMore = `\nNo hay más salidas hoy de ${origin} a ${destination}.`;

  if (firstTomorrow) {
    const h = String(firstTomorrow.departureTime.hours).padStart(2, "0");
    const m = String(firstTomorrow.departureTime.minutes).padStart(2, "0");
    return `${header}${noMore}\n\n🌅 Primera salida mañana: <b>${h}:${m}</b> — ${firstTomorrow.lineName}`;
  }

  return `${header}${noMore}`;
}

function formatDisambiguation(field: "origin" | "destination", candidates: Station[]): string {
  const fieldLabel = field === "origin" ? "origen" : "destino";
  const names = candidates.map((c) => c.name.value).join(", ");
  return `🔍 Varias estaciones encontradas como ${fieldLabel}: ${names}\n\n¿Cuál querías decir?`;
}

function buildDisambiguationKeyboard(
  field: "origin" | "destination",
  candidates: Station[],
  otherName: string,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const candidate of candidates) {
    // Callback data format: d|o|StationName|OtherName or d|d|OtherName|StationName
    const f = field === "origin" ? "o" : "d";
    const data = `d|${f}|${candidate.name.value}|${otherName}`;
    keyboard.text(candidate.name.value, data.slice(0, 64)).row();
  }
  return keyboard;
}
