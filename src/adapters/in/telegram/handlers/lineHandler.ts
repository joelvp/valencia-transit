import type { Context } from "grammy";
import type { ListLines } from "@/core/application/query/ListLines";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import { getT } from "@/adapters/in/telegram/i18n";
import { getLang } from "@/adapters/in/telegram/languageStore";
import { lineNumberToEmoji } from "@/adapters/in/telegram/lineEmoji";

export function lineHandler(listLines: ListLines, userRepository: UserRepository) {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = getT(getLang(chatId));

    const traceId = ctx.from ? String(ctx.from.id) : undefined;
    const results = await listLines.execute(traceId);

    const buttons = results.map(({ line, terminalFrom, terminalTo }) => {
      const colorEmoji = lineNumberToEmoji(line.id.value);
      const label = `${colorEmoji} L${line.id.value}: ${terminalFrom} → ${terminalTo}`;
      return [{ text: label, callback_data: `li|${line.id.value}` }];
    });

    await ctx.reply(t("linesTitle"), {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons },
    });

    if (ctx.from) {
      await userRepository.upsert({
        chatId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
      });
    }
  };
}
