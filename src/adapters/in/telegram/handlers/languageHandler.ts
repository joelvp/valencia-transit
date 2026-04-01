import type { Context } from "grammy";
import type { Lang } from "@/adapters/in/telegram/i18n";
import { getT } from "@/adapters/in/telegram/i18n";
import { setLang, getLang } from "@/adapters/in/telegram/languageStore";

export function languageHandler() {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = getT(getLang(chatId));
    await ctx.reply(t("langPickerText"), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🇪🇸 Castellano", callback_data: "lang|es" },
            { text: "🍊 Valencià", callback_data: "lang|val" },
            { text: "🇬🇧 English", callback_data: "lang|en" },
          ],
        ],
      },
    });
  };
}

export async function handleLanguageCallback(
  ctx: Context,
  lang: Lang,
  setCommandsForChat: (chatId: number, lang: Lang) => Promise<void>,
): Promise<void> {
  const chatId = ctx.chat?.id ?? 0;
  setLang(chatId, lang);
  const t = getT(lang);
  await ctx.answerCallbackQuery();
  await Promise.all([ctx.editMessageText(t("langChanged")), setCommandsForChat(chatId, lang)]);
  // TODO: call ChangeUserLanguage use case once user UUID resolution is implemented
}
