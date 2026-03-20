import type { Context } from "grammy";

const HELP_TEXT = [
  "🤖 Valencia Transit Bot",
  "",
  "Available commands:",
  "/salida <origin> - <destination> — Next departures between two stations",
  "/paradas — List all stations",
  "/help — Show this help",
].join("\n");

export function helpHandler() {
  return async (ctx: Context): Promise<void> => {
    await ctx.reply(HELP_TEXT);
  };
}
