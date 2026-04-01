import type { Context } from "grammy";
import type { EventBus } from "@/core/domain/event/EventBus";
import { HelpRequested } from "@/core/domain/event/HelpRequested";
import { getT } from "@/adapters/in/telegram/i18n";
import { getLang } from "@/adapters/in/telegram/languageStore";

export function helpHandler(eventBus: EventBus) {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = getT(getLang(chatId));
    await ctx.reply(t("helpText"), { parse_mode: "HTML" });

    const traceId = ctx.from ? String(ctx.from.id) : undefined;
    const helpRequestedEvent = new HelpRequested();
    helpRequestedEvent.traceId = traceId;
    void eventBus.publish(helpRequestedEvent);
  };
}
