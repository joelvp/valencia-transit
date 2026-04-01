import type { ListLines } from "@/core/application/query/ListLines";
import { getT } from "@/adapters/in/telegram/i18n";
import { getLang } from "@/adapters/in/telegram/languageStore";
import { lineNumberToEmoji } from "@/adapters/in/telegram/lineEmoji";
import type { ExtendedContext } from "@/adapters/in/telegram/middleware/userMiddleware";

export function lineHandler(listLines: ListLines) {
  return async (ctx: ExtendedContext): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = getT(getLang(chatId));

    const results = await listLines.execute(ctx.userId || undefined, ctx.requestId);

    const buttons = results.map(({ line, terminalFrom, terminalTo }) => {
      const colorEmoji = lineNumberToEmoji(line.id.value);
      const label = `${colorEmoji} L${line.id.value}: ${terminalFrom} → ${terminalTo}`;
      return [{ text: label, callback_data: `li|${line.id.value}` }];
    });

    await ctx.reply(t("linesTitle"), {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons },
    });
  };
}
