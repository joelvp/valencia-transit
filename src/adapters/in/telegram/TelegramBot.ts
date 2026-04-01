import { Bot } from "grammy";
import { limit } from "@grammyjs/ratelimiter";
import type { Update, UserFromGetMe } from "grammy/types";
import type { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import type { FindStation } from "@/core/application/query/FindStation";
import type { ListLines } from "@/core/application/query/ListLines";
import type { GetLineStations } from "@/core/application/query/GetLineStations";
import type { ChangeUserLanguage } from "@/core/application/command/ChangeUserLanguage";
import type { EventBus } from "@/core/domain/event/EventBus";
import type { UserRepository } from "@/core/domain/user/UserRepository";
import { departureHandler } from "@/adapters/in/telegram/handlers/departureHandler";
import { helpHandler } from "@/adapters/in/telegram/handlers/helpHandler";
import { callbackHandler } from "@/adapters/in/telegram/handlers/callbackHandler";
import { languageHandler } from "@/adapters/in/telegram/handlers/languageHandler";
import { lineHandler } from "@/adapters/in/telegram/handlers/lineHandler";
import {
  createUserMiddleware,
  type ExtendedContext,
} from "@/adapters/in/telegram/middleware/userMiddleware";
import { getT, type Lang } from "./i18n";
import { getLang } from "./languageStore";
import { LANG_COMMANDS, DEPARTURE_COMMANDS, CANCEL_COMMANDS } from "./commands";
import {
  clearConversationState as clearConvState,
  getConversationState,
} from "./conversationStore";
import { logger } from "@/config/logger";

export interface TelegramBotOptions {
  /** Pre-set bot info to skip the `getMe` network call. Useful in tests. */
  botInfo?: UserFromGetMe;
  /** Disable rate limiting. Useful in tests. */
  disableRateLimit?: boolean;
}

export class TelegramBot {
  private readonly bot: Bot<ExtendedContext>;

  constructor(
    private readonly token: string | undefined,
    private readonly searchNextDepartures: SearchNextDepartures,
    private readonly findStation: FindStation,
    private readonly listLines: ListLines,
    private readonly getLineStations: GetLineStations,
    private readonly eventBus: EventBus,
    private readonly userRepository: UserRepository,
    private readonly changeUserLanguage: ChangeUserLanguage,
    options: TelegramBotOptions = {},
  ) {
    this.bot = new Bot<ExtendedContext>(token ?? "fake-token", { botInfo: options.botInfo });

    if (!options.disableRateLimit) {
      this.bot.use(
        limit({
          timeFrame: 2000,
          limit: 3,
          onLimitExceeded: async (ctx) => {
            const chatId = ctx.chat?.id ?? 0;
            const t = getT(getLang(chatId));
            await ctx.reply(t("rateLimitExceeded"));
          },
        }),
      );
    }

    // User middleware: upsert user, attach requestId + userId to context
    this.bot.use(createUserMiddleware(this.userRepository));

    this.bot.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const updateType = Object.keys(ctx.update).find((k) => k !== "update_id") ?? "unknown";
      logger.info(
        { durationMs: Date.now() - start, updateType, chatId: ctx.chat?.id },
        "Request handled",
      );
    });

    this.bot.catch((err) => {
      logger.error({ err: err.error }, "Unhandled bot error");
    });

    // Clear conversation state when any non-departure command is used
    this.bot.use(async (ctx, next) => {
      if (ctx.message?.text?.startsWith("/") && ctx.chat) {
        const cmd = ctx.message.text.split(" ")[0]?.split("@")[0];
        if (!DEPARTURE_COMMANDS.has(cmd ?? "") && !CANCEL_COMMANDS.has(cmd ?? "")) {
          clearConvState(ctx.chat.id);
        }
      }
      await next();
    });

    const allDepartures = Object.values(LANG_COMMANDS).map((c) => c.departure);
    const allAliases = Object.values(LANG_COMMANDS).map((c) => c.alias);
    const allLines = Object.values(LANG_COMMANDS).map((c) => c.lines);
    const allCancels = Object.values(LANG_COMMANDS).map((c) => c.cancel);
    const allLanguages = [...new Set(Object.values(LANG_COMMANDS).map((c) => c.language))];
    const allHelps = [...new Set(Object.values(LANG_COMMANDS).map((c) => c.help))];

    this.bot.command(allDepartures, departureHandler(this.searchNextDepartures, this.findStation));
    this.bot.command(allAliases, departureHandler(this.searchNextDepartures, this.findStation));
    this.bot.command(allCancels, async (ctx) => {
      const chatId = ctx.chat?.id ?? 0;
      const t = getT(getLang(chatId));
      if (!getConversationState(chatId)) {
        await ctx.reply(t("nothingToCancel"));
        return;
      }
      clearConvState(chatId);
      await ctx.reply(t("cancelledSearch"));
    });
    this.bot.command(allLines, lineHandler(this.listLines));
    this.bot.command(allHelps, helpHandler(this.eventBus));
    this.bot.command("start", helpHandler(this.eventBus));
    this.bot.command(allLanguages, languageHandler());
    this.bot.on(
      "callback_query:data",
      callbackHandler(
        this.searchNextDepartures,
        this.getLineStations,
        this.eventBus,
        this.setCommandsForChat.bind(this),
        this.changeUserLanguage,
      ),
    );
    this.bot.on("message:text", departureHandler(this.searchNextDepartures, this.findStation));
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

  async restoreCommandScopes(languages: Map<string, string>): Promise<void> {
    for (const [chatId, lang] of languages) {
      if (lang === "val" || lang === "en") {
        await this.setCommandsForChat(parseInt(chatId), lang as Lang);
      }
    }
    logger.info({ count: languages.size }, "Command scopes restored");
  }

  async setCommandsForChat(chatId: number, lang: Lang): Promise<void> {
    await this.bot.api.setMyCommands(this.buildCommands(lang), {
      scope: { type: "chat", chat_id: chatId },
    });
  }

  private buildCommands(lang: Lang) {
    const t = getT(lang);
    const cmd = LANG_COMMANDS[lang];
    return [
      { command: cmd.departure, description: t("cmdSalida") },
      { command: cmd.lines, description: t("cmdLineas") },
      { command: cmd.language, description: t("cmdIdioma") },
      { command: cmd.help, description: t("cmdHelp") },
      { command: cmd.cancel, description: t("cmdCancelar") },
    ];
  }
}
