import { Bot } from "grammy";
import { limit } from "@grammyjs/ratelimiter";
import type { Update, UserFromGetMe } from "grammy/types";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import type { ListLines } from "@/core/application/query/ListLines";
import type { GetLineStations } from "@/core/application/query/GetLineStations";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import type { EventBus } from "@/core/domain/event/EventBus";
import { departureHandler } from "@/adapters/in/telegram/handlers/departureHandler";
import { helpHandler } from "@/adapters/in/telegram/handlers/helpHandler";
import { callbackHandler } from "@/adapters/in/telegram/handlers/callbackHandler";
import { languageHandler } from "@/adapters/in/telegram/handlers/languageHandler";
import { lineHandler } from "@/adapters/in/telegram/handlers/lineHandler";
import { translations, type Lang } from "@/adapters/in/telegram/i18n";
import { getT } from "@/adapters/in/telegram/languageStore";
import { logger } from "@/config/logger";

export interface TelegramBotOptions {
  /** Pre-set bot info to skip the `getMe` network call. Useful in tests. */
  botInfo?: UserFromGetMe;
  /** Disable rate limiting. Useful in tests. */
  disableRateLimit?: boolean;
}

export class TelegramBot {
  private readonly bot: Bot;

  constructor(
    private readonly token: string | undefined,
    private readonly searchNextDepartures: SearchNextDepartures,
    private readonly listLines: ListLines,
    private readonly getLineStations: GetLineStations,
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
    options: TelegramBotOptions = {},
  ) {
    this.bot = new Bot(token ?? "fake-token", { botInfo: options.botInfo });

    if (!options.disableRateLimit) {
      this.bot.use(
        limit({
          timeFrame: 2000,
          limit: 3,
          onLimitExceeded: async (ctx) => {
            const chatId = ctx.chat?.id ?? 0;
            const t = getT(chatId);
            await ctx.reply(t.rateLimitExceeded);
          },
        }),
      );
    }

    this.bot.catch((err) => {
      logger.error({ err: err.error }, "Unhandled bot error");
    });

    this.bot.command(
      ["salida", "eixida"],
      departureHandler(this.searchNextDepartures, this.userRepository),
    );
    this.bot.command(["s", "e"], departureHandler(this.searchNextDepartures, this.userRepository));
    this.bot.command(
      ["lineas", "linies"],
      lineHandler(this.listLines, this.userRepository, this.eventBus),
    );
    this.bot.command("help", helpHandler(this.userRepository, this.eventBus));
    this.bot.command("start", helpHandler(this.userRepository, this.eventBus));
    this.bot.command(
      "idioma",
      languageHandler(this.setCommandsForChat.bind(this), this.userRepository, this.eventBus),
    );
    this.bot.on(
      "callback_query:data",
      callbackHandler(
        this.searchNextDepartures,
        this.getLineStations,
        this.userRepository,
        this.eventBus,
      ),
    );
    this.bot.on("message:text", departureHandler(this.searchNextDepartures, this.userRepository));
  }

  async handleUpdate(update: Update): Promise<void> {
    await this.bot.handleUpdate(update);
  }

  async start(): Promise<void> {
    if (!this.token) {
      throw new Error("BOT_TOKEN is required to start the Telegram bot");
    }

    await this.bot.api.setMyCommands(this.buildCommands("es"));
    logger.info("Bot started");
    await this.bot.start();
  }

  async setCommandsForChat(chatId: number, lang: Lang): Promise<void> {
    await this.bot.api.setMyCommands(this.buildCommands(lang), {
      scope: { type: "chat", chat_id: chatId },
    });
  }

  private buildCommands(lang: Lang) {
    const t = translations[lang];
    const isVal = lang === "val";
    return [
      { command: isVal ? "linies" : "lineas", description: t.cmdLineas },
      { command: "help", description: t.cmdHelp },
    ];
  }
}
