import type { Context } from "grammy";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { getT } from "@/adapters/in/telegram/languageStore";
import { formatDepartures, formatNoMoreToday } from "@/adapters/in/telegram/handlers/formatters";

export function callbackHandler(useCase: SearchNextDepartures) {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = getT(chatId);
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const parsed = parseCallbackData(data);
    if (!parsed) {
      await ctx.answerCallbackQuery({ text: t.errInvalidData });
      return;
    }

    const { originName, destinationName } = parsed;

    try {
      const result = await useCase.execute(originName, destinationName, new Date());

      if (result.type === "disambiguation") {
        await ctx.answerCallbackQuery({ text: t.errStillAmbiguous });
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
    return { originName: parts[2]!, destinationName: parts[3]! };
  }

  return null;
}
