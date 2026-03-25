import type { Context } from "grammy";
import type { Lang } from "@/adapters/in/telegram/i18n";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { LanguageChanged } from "@/core/domain/event/LanguageChanged";
import { translations } from "@/adapters/in/telegram/i18n";
import { setLang, getLang } from "@/adapters/in/telegram/languageStore";

const VALID_LANGS: Lang[] = ["es", "val"];

export function languageHandler(
  setCommandsForChat: (chatId: number, lang: Lang) => Promise<void>,
  userRepository: UserRepository,
  eventBus: EventBus,
) {
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

    if (ctx.from) {
      const traceId = String(ctx.from.id);
      await userRepository.upsert({
        chatId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
      });
      await eventBus.publish(new LanguageChanged(arg, traceId), traceId);
    }
  };
}
