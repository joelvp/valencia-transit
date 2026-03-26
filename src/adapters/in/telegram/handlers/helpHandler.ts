import type { Context } from "grammy";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { HelpRequested } from "@/core/domain/event/HelpRequested";
import { getT } from "@/adapters/in/telegram/i18n";
import { getLang } from "@/adapters/in/telegram/languageStore";

export function helpHandler(userRepository: UserRepository, eventBus: EventBus) {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = getT(getLang(chatId));
    await ctx.reply(t("helpText"), { parse_mode: "HTML" });

    if (ctx.from) {
      const traceId = String(ctx.from.id);
      await userRepository.upsert({
        chatId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
      });
      const helpRequestedEvent = new HelpRequested();
      helpRequestedEvent.traceId = traceId;
      void eventBus.publish(helpRequestedEvent);
    }
  };
}
