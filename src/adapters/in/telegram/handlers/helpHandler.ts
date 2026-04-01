import type { EventBus } from "@/core/domain/event/EventBus";
import { HelpRequested } from "@/core/domain/event/HelpRequested";
import { getT } from "@/adapters/in/telegram/i18n";
import { getLang } from "@/adapters/in/telegram/languageStore";
import type { ExtendedContext } from "@/adapters/in/telegram/middleware/userMiddleware";

export function helpHandler(eventBus: EventBus) {
  return async (ctx: ExtendedContext): Promise<void> => {
    const chatId = ctx.chat?.id ?? 0;
    const t = getT(getLang(chatId));
    await ctx.reply(t("helpText"), { parse_mode: "HTML" });

    const helpRequestedEvent = new HelpRequested(ctx.userId || undefined);
    helpRequestedEvent.traceId = ctx.requestId;
    void eventBus.publish(helpRequestedEvent);
  };
}
