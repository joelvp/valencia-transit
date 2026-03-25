import type { Context } from "grammy";
import type { ListLines } from "@/core/application/query/ListLines";
import { getT } from "@/adapters/in/telegram/languageStore";
import { lineNumberToEmoji, lineNumberToHeaderEmoji } from "@/adapters/in/telegram/lineEmoji";

export function lineHandler(listLines: ListLines) {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = getT(chatId);

    const results = await listLines.execute();

    const buttons = results.map(({ line, terminalFrom, terminalTo }) => {
      const colorEmoji = lineNumberToEmoji(line.id.value);
      const transportEmoji = lineNumberToHeaderEmoji(line.id.value);
      const label = `${colorEmoji} ${transportEmoji} L${line.id.value}: ${terminalFrom} → ${terminalTo}`;
      return [{ text: label, callback_data: `li|${line.id.value}` }];
    });

    await ctx.reply(t.linesTitle, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons },
    });
  };
}
