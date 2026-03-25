import type { Context } from "grammy";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import type { GetLineStations } from "@/core/application/query/GetLineStations";
import { getT } from "@/adapters/in/telegram/languageStore";
import { formatDepartures, formatNoMoreToday } from "@/adapters/in/telegram/handlers/formatters";
import {
  formatDisambiguation,
  buildDisambiguationKeyboard,
} from "@/adapters/in/telegram/handlers/disambiguation";
import { lineNumberToEmoji, lineNumberToHeaderEmoji } from "@/adapters/in/telegram/lineEmoji";

export function callbackHandler(useCase: SearchNextDepartures, getLineStations: GetLineStations) {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = getT(chatId);
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    // Handle line stations callback
    if (data.startsWith("li|")) {
      const parts = data.split("|");
      const lineId = parts[1];
      if (!lineId) {
        await ctx.answerCallbackQuery({ text: t.errInvalidData });
        return;
      }

      const result = await getLineStations.execute(lineId);
      if (!result) {
        await ctx.answerCallbackQuery({ text: t.errLineNotFound });
        return;
      }

      await ctx.answerCallbackQuery();
      const transportEmoji = lineNumberToHeaderEmoji(result.line.id.value);
      const colorEmoji = lineNumberToEmoji(result.line.id.value);
      const from = result.stations[0]?.name ?? "";
      const to = result.stations[result.stations.length - 1]?.name ?? "";
      const header = `${transportEmoji} ${colorEmoji} <b>L${result.line.id.value}: ${from} → ${to}</b>`;
      const locationButtons = result.stations.map((s, i) => [
        {
          text: `${i + 1}. ${s.name}`,
          callback_data: `loc|${s.latitude.toFixed(6)}|${s.longitude.toFixed(6)}`,
        },
      ]);

      await ctx.reply(header, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: locationButtons },
      });
      return;
    }

    // Handle location callback
    if (data.startsWith("loc|")) {
      const parts = data.split("|");
      const lat = parseFloat(parts[1] ?? "");
      const lon = parseFloat(parts[2] ?? "");
      if (isNaN(lat) || isNaN(lon)) {
        await ctx.answerCallbackQuery({ text: t.errInvalidData });
        return;
      }
      await ctx.answerCallbackQuery();
      await ctx.replyWithLocation(lat, lon);
      return;
    }

    const parsed = parseCallbackData(data);
    if (!parsed) {
      await ctx.answerCallbackQuery({ text: t.errInvalidData });
      return;
    }

    const { originName, destinationName } = parsed;

    try {
      const result = await useCase.execute(originName, destinationName, new Date());

      if (result.type === "disambiguation") {
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(formatDisambiguation(t, result.field, result.candidates), {
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
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
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

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
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
    } catch {
      await ctx.answerCallbackQuery({ text: t.errUnknown });
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
    return { originName: parts[3]!, destinationName: parts[2]! };
  }

  return null;
}
