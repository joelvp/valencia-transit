import type { Context } from "grammy";
import type { Lang } from "@/adapters/in/telegram/i18n";
import { translations } from "@/adapters/in/telegram/i18n";
import { setLang, getLang } from "@/adapters/in/telegram/languageStore";

const VALID_LANGS: Lang[] = ["es", "val"];

export function languageHandler(setCommandsForChat: (chatId: number, lang: Lang) => Promise<void>) {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const text = ctx.message?.text ?? "";
    const arg = text
      .trim()
      .replace(/^\/\S+\s*/, "")
      .toLowerCase() as Lang;

    if (!VALID_LANGS.includes(arg)) {
      const t = translations[getLang(chatId)];
      await ctx.reply(t.langUnknown);
      return;
    }

    setLang(chatId, arg);
    await Promise.all([ctx.reply(translations[arg].langChanged), setCommandsForChat(chatId, arg)]);
  };
}
