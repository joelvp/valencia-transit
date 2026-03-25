import type { Context } from "grammy";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { HelpRequested } from "@/core/domain/event/HelpRequested";
import { getT } from "@/adapters/in/telegram/languageStore";

export function helpHandler(userRepository: UserRepository, eventBus: EventBus) {
  return async (ctx: Context): Promise<void> => {
    const t = getT(ctx.chat?.id ?? 0);
    await ctx.reply(t.helpText, { parse_mode: "HTML" });

    if (ctx.from) {
      const traceId = String(ctx.from.id);
      await userRepository.upsert({
        chatId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
      });
      await eventBus.publish(new HelpRequested(), traceId);
    }
  };
}
