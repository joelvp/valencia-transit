import type { Context } from "grammy";
import type { Lang } from "@/adapters/in/telegram/i18n";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { LanguageChanged } from "@/core/domain/event/LanguageChanged";
import { translations } from "@/adapters/in/telegram/i18n";
import { setLang, getLang } from "@/adapters/in/telegram/languageStore";

export function languageHandler() {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = translations[getLang(chatId)];
    await ctx.reply(t.langPickerText, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🇪🇸 Castellano", callback_data: "lang|es" },
            { text: "🍊 Valencià", callback_data: "lang|val" },
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
  userRepository: UserRepository,
  eventBus: EventBus,
): Promise<void> {
  const chatId = ctx.chat?.id ?? 0;
  setLang(chatId, lang);
  await ctx.answerCallbackQuery();
  await Promise.all([
    ctx.editMessageText(translations[lang].langChanged),
    setCommandsForChat(chatId, lang),
  ]);

  if (ctx.from) {
    const traceId = String(ctx.from.id);
    await userRepository.upsert({
      chatId: ctx.from.id,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
    });
    const languageChangedEvent = new LanguageChanged(lang, traceId);
    languageChangedEvent.traceId = traceId;
    void eventBus.publish(languageChangedEvent);
  }
}
