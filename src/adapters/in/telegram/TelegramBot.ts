import { Bot } from "grammy";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import type { ListAllStations } from "@/core/application/query/ListAllStations";
import { departureHandler } from "@/adapters/in/telegram/handlers/departureHandler";
import { stationHandler } from "@/adapters/in/telegram/handlers/stationHandler";
import { helpHandler } from "@/adapters/in/telegram/handlers/helpHandler";

export class TelegramBot {
  constructor(
    private readonly token: string | undefined,
    private readonly searchNextDepartures: SearchNextDepartures,
    private readonly listAllStations: ListAllStations,
  ) {}

  async start(): Promise<void> {
    if (!this.token) {
      throw new Error("BOT_TOKEN is required to start the Telegram bot");
    }

    const bot = new Bot(this.token);

    bot.catch((err) => {
      console.error("[TelegramBot] Unhandled error:", err.error);
    });

    bot.command("salida", departureHandler(this.searchNextDepartures));
    bot.command("paradas", stationHandler(this.listAllStations));
    bot.command("help", helpHandler());
    bot.command("start", helpHandler());

    console.log("[TelegramBot] Starting bot...");
    await bot.start();
  }
}
