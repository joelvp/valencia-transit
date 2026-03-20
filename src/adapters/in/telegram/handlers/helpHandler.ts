import type { Context } from "grammy";
import { getT } from "@/adapters/in/telegram/languageStore";

export function helpHandler() {
  return async (ctx: Context): Promise<void> => {
    const t = getT(ctx.chat?.id ?? 0);
    await ctx.reply(t.helpText, { parse_mode: "HTML" });
  };
}
