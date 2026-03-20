import { Bot } from "grammy";
import type { Update, UserFromGetMe } from "grammy/types";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import type { ListStationsWithLines } from "@/core/application/query/ListStationsWithLines";
import { departureHandler } from "@/adapters/in/telegram/handlers/departureHandler";
import { stationHandler } from "@/adapters/in/telegram/handlers/stationHandler";
import { helpHandler } from "@/adapters/in/telegram/handlers/helpHandler";
import { callbackHandler } from "@/adapters/in/telegram/handlers/callbackHandler";
import { languageHandler } from "@/adapters/in/telegram/handlers/languageHandler";

export interface TelegramBotOptions {
  /** Pre-set bot info to skip the `getMe` network call. Useful in tests. */
  botInfo?: UserFromGetMe;
}

export class TelegramBot {
  private readonly bot: Bot;

  constructor(
    private readonly token: string | undefined,
    private readonly searchNextDepartures: SearchNextDepartures,
    private readonly listStationsWithLines: ListStationsWithLines,
    options: TelegramBotOptions = {},
  ) {
    this.bot = new Bot(token ?? "fake-token", { botInfo: options.botInfo });

    this.bot.catch((err) => {
      console.error("[TelegramBot] Unhandled error:", err.error);
    });

    this.bot.command("salida", departureHandler(this.searchNextDepartures));
    this.bot.command("s", departureHandler(this.searchNextDepartures));
    this.bot.command("paradas", stationHandler(this.listStationsWithLines));
    this.bot.command("help", helpHandler());
    this.bot.command("start", helpHandler());
    this.bot.command("idioma", languageHandler());
    this.bot.on("callback_query:data", callbackHandler(this.searchNextDepartures));
  }

  async handleUpdate(update: Update): Promise<void> {
    await this.bot.handleUpdate(update);
  }

  async start(): Promise<void> {
    if (!this.token) {
      throw new Error("BOT_TOKEN is required to start the Telegram bot");
    }

    console.log("[TelegramBot] Starting bot...");
    await this.bot.api.setMyCommands([
      { command: "salida", description: "Próximas salidas: /salida <origen> - <destino>" },
      { command: "s", description: "Atajo para /salida" },
      { command: "paradas", description: "Listar estaciones" },
      { command: "idioma", description: "Cambiar idioma: /idioma es | val" },
      { command: "help", description: "Ayuda" },
    ]);
    await this.bot.start();
  }
}
