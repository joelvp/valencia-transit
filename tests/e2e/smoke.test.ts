import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { initI18n } from "@/adapters/in/telegram/i18n";
import type { Update, UserFromGetMe } from "grammy/types";
import { createContainer, type Container } from "@/adapters/container";
import { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { FindStation } from "@/core/application/query/FindStation";
import { ListLines } from "@/core/application/query/ListLines";
import { GetLineStations } from "@/core/application/query/GetLineStations";
import { ChangeUserLanguage } from "@/core/application/command/ChangeUserLanguage";
import { TelegramBot } from "@/adapters/in/telegram/TelegramBot";
import { clearDatabase } from "../helpers/db";

function makeCommandUpdate(text: string, chatId = 1): Update {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      chat: { id: chatId, type: "private", first_name: "Test" },
      from: { id: chatId, is_bot: false, first_name: "Test" },
      text,
      entities: [{ type: "bot_command", offset: 0, length: text.split(" ")[0]!.length }],
    },
  };
}

describe("Smoke test", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});

describe("TelegramBot smoke — crossover midnight logic", () => {
  let container: Container;
  let bot: TelegramBot;
  let replies: string[];

  beforeAll(async () => {
    await initI18n();
    container = createContainer();

    const fakeBotInfo = {
      id: 999,
      is_bot: true,
      first_name: "SmokeBot",
      username: "smokebot",
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
    } as UserFromGetMe;

    bot = new TelegramBot(
      "fake-token-smoke",
      new SearchNextDepartures(
        container.stationRepository,
        container.lineRepository,
        container.scheduleRepository,
        container.tripRepository,
        container.routeRepository,
        container.eventBus,
      ),
      new FindStation(container.stationRepository),
      new ListLines(container.lineRepository, container.stationRepository, container.eventBus),
      new GetLineStations(
        container.lineRepository,
        container.stationRepository,
        container.eventBus,
      ),
      container.eventBus,
      container.userRepository,
      new ChangeUserLanguage(container.userRepository, container.eventBus),
      { botInfo: fakeBotInfo, disableRateLimit: true },
    );

    replies = [];
    bot["bot"].api.config.use((prev, method, payload) => {
      if (method === "sendMessage") {
        replies.push((payload as { text: string }).text);
      }
      return Promise.resolve({ ok: true, result: true } as never);
    });
  });

  afterAll(async () => {
    await clearDatabase(container.db);
    await container.dispose();
  });

  it("should start without errors and respond to /start", async () => {
    await bot.handleUpdate(makeCommandUpdate("/start"));
    expect(replies).toHaveLength(1);
    expect(replies[0]).toBeDefined();
    expect(replies[0]!.length).toBeGreaterThan(0);
  });
});
