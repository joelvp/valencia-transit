import { Bot } from "grammy";
import type { Update, UserFromGetMe } from "grammy/types";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import type { ListAllStations } from "@/core/application/query/ListAllStations";
import { departureHandler } from "@/adapters/in/telegram/handlers/departureHandler";
import { stationHandler } from "@/adapters/in/telegram/handlers/stationHandler";
import { helpHandler } from "@/adapters/in/telegram/handlers/helpHandler";

export interface TelegramBotOptions {
  /** Pre-set bot info to skip the `getMe` network call. Useful in tests. */
  botInfo?: UserFromGetMe;
}

export class TelegramBot {
  private readonly bot: Bot;

  constructor(
    private readonly token: string | undefined,
    private readonly searchNextDepartures: SearchNextDepartures,
    private readonly listAllStations: ListAllStations,
    options: TelegramBotOptions = {},
  ) {
    this.bot = new Bot(token ?? "fake-token", { botInfo: options.botInfo });

    this.bot.catch((err) => {
      console.error("[TelegramBot] Unhandled error:", err.error);
    });

    this.bot.command("salida", departureHandler(this.searchNextDepartures));
    this.bot.command("paradas", stationHandler(this.listAllStations));
    this.bot.command("help", helpHandler());
    this.bot.command("start", helpHandler());
  }

  async handleUpdate(update: Update): Promise<void> {
    await this.bot.handleUpdate(update);
  }

  async start(): Promise<void> {
    if (!this.token) {
      throw new Error("BOT_TOKEN is required to start the Telegram bot");
    }

    console.log("[TelegramBot] Starting bot...");
    await this.bot.start();
  }
}
