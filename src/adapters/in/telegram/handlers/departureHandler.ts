import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import type { Station } from "@/core/domain/station/Station";
import type { Translations } from "@/adapters/in/telegram/i18n";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { NoConnectionError } from "@/core/domain/error/NoConnectionError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";
import { getT } from "@/adapters/in/telegram/languageStore";
import { formatDepartures, formatNoMoreToday } from "@/adapters/in/telegram/handlers/formatters";

export function departureHandler(useCase: SearchNextDepartures) {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = getT(chatId);
    const text = ctx.message?.text ?? "";
    const args = text.trim().replace(/^\/\S+\s*/, "");

    if (!args) {
      await ctx.reply(t.usage, { parse_mode: "HTML" });
      return;
    }

    const parsed = parseStations(args);
    if (!parsed) {
      await ctx.reply(t.usage, { parse_mode: "HTML" });
      return;
    }

    const { originName, destinationName } = parsed;

    try {
      const result = await useCase.execute(originName, destinationName, new Date());

      if (result.type === "disambiguation") {
        await ctx.reply(formatDisambiguation(t, result.field, result.candidates), {
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
            t,
            result.origin.name.value,
            result.destination.name.value,
            result.firstTomorrow,
            result.routeLineName,
          ),
          { parse_mode: "HTML" },
        );
        return;
      }

      await ctx.reply(
        formatDepartures(
          t,
          result.data.origin.name.value,
          result.data.destination.name.value,
          result.data.departures,
          result.data.firstTomorrow,
          result.data.routeLineName,
        ),
        { parse_mode: "HTML" },
      );
    } catch (err) {
      if (err instanceof StationNotFoundError) {
        const match = /^Station not found: "(.+)"$/.exec(err.message);
        const stationName = match ? match[1]! : "unknown";
        await ctx.reply(t.errNotFound(stationName));
      } else if (err instanceof NoConnectionError) {
        await ctx.reply(t.errNoConn(originName, destinationName));
      } else if (err instanceof NoActiveServiceError) {
        await ctx.reply(t.errNoService);
      } else {
        await ctx.reply(t.errUnknown);
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

function formatDisambiguation(
  t: Translations,
  field: "origin" | "destination",
  candidates: Station[],
): string {
  const names = candidates.map((c) => c.name.value).join(", ");
  return t.disambiguation(field, names);
}

function buildDisambiguationKeyboard(
  field: "origin" | "destination",
  candidates: Station[],
  otherName: string,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const candidate of candidates) {
    const f = field === "origin" ? "o" : "d";
    const data = `d|${f}|${candidate.name.value}|${otherName}`;
    keyboard.text(candidate.name.value, data.slice(0, 64)).row();
  }
  return keyboard;
}
