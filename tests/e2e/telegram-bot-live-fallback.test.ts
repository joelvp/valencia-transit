import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { clearConversationState } from "@/adapters/in/telegram/conversationStore";
import { initI18n } from "@/adapters/in/telegram/i18n";
import type { Update, UserFromGetMe } from "grammy/types";
import { createContainer, type Container } from "@/adapters/container";
import { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { FindStation } from "@/core/application/query/FindStation";
import { ListLines } from "@/core/application/query/ListLines";
import { GetLineStations } from "@/core/application/query/GetLineStations";
import { ChangeUserLanguage } from "@/core/application/command/ChangeUserLanguage";
import { TelegramBot } from "@/adapters/in/telegram/TelegramBot";
import { LiveDepartureProviderFgv } from "@/adapters/out/live-departures/provider-fgv/LiveDepartureProviderFgv";
import {
  FgvApiClient,
  type FgvFetch,
} from "@/adapters/out/live-departures/provider-fgv/FgvApiClient";
import { clearDatabase } from "../helpers/db";
import {
  stations,
  routes,
  lines,
  lineStations,
  schedules,
  scheduleExceptions,
  trips,
  passingTimes,
  fgvStationIds,
} from "@/adapters/out/persistence/drizzle/schema";

const FEED_ID = "FV1";
const LINK_FEED_ID = "metrovalencia";

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

describe("TelegramBot live-departures fail-safe E2E", () => {
  let container: Container;
  let bot: TelegramBot;
  let replies: string[];
  let fgvFetch: FgvFetch;
  let fgvCalls: number;

  beforeAll(async () => {
    await initI18n();
    container = createContainer();

    const provider = new LiveDepartureProviderFgv(
      container.liveStationLinkRepository,
      new FgvApiClient(
        (url, init) => {
          fgvCalls++;
          return fgvFetch(url, init);
        },
        "https://fgv.test/api",
        50,
      ),
    );
    const searchNextDepartures = new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.routeRepository,
      container.eventBus,
      container.serviceCalendar,
      provider,
    );
    const fakeBotInfo = {
      id: 123456789,
      is_bot: true,
      first_name: "TestBot",
      username: "testbot",
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
    } as UserFromGetMe;

    bot = new TelegramBot(
      "fake-token-for-testing",
      searchNextDepartures,
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

    bot["bot"].api.config.use((_prev, method, payload) => {
      if (method === "sendMessage") {
        replies.push((payload as { text: string }).text);
      }
      return Promise.resolve({ ok: true, result: true } as never);
    });
  });

  beforeEach(async () => {
    await clearDatabase(container.db);
    replies = [];
    fgvCalls = 0;
    clearConversationState(1);

    await container.db.insert(stations).values([
      {
        id: "ST1",
        feedId: FEED_ID,
        name: "Colón",
        latitude: 39.4682,
        longitude: -0.3765,
        transportTypes: ["metro"],
      },
      {
        id: "ST2",
        feedId: FEED_ID,
        name: "Xàtiva",
        latitude: 39.4676,
        longitude: -0.3789,
        transportTypes: ["metro"],
      },
    ]);
    await container.db
      .insert(lines)
      .values([
        { id: "1", feedId: FEED_ID, name: "Línia 1", transportType: "metro", color: "FEC601" },
      ]);
    await container.db
      .insert(routes)
      .values([{ id: "R1", feedId: FEED_ID, transportType: "metro", lineId: "1" }]);
    await container.db.insert(lineStations).values([
      { lineId: "1", stationId: "ST1", feedId: FEED_ID, sequence: 1 },
      { lineId: "1", stationId: "ST2", feedId: FEED_ID, sequence: 2 },
    ]);
    await container.db.insert(schedules).values([
      {
        id: "WD",
        feedId: FEED_ID,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
        startDate: "2024-01-01",
        endDate: "2099-12-31",
      },
    ]);
    const today = container.serviceCalendar.serviceDateOf(new Date()).value;
    await container.db
      .insert(scheduleExceptions)
      .values([{ scheduleId: "WD", feedId: FEED_ID, date: today, isActive: true }]);
    await container.db
      .insert(trips)
      .values([{ id: "T1", feedId: FEED_ID, routeId: "R1", scheduleId: "WD", headsign: "Xàtiva" }]);
    // GTFS next-day notation (25:xx) so the departure is always upcoming
    await container.db.insert(passingTimes).values([
      {
        tripId: "T1",
        stationId: "ST1",
        feedId: FEED_ID,
        arrivalTime: "25:00:00",
        departureTime: "25:00:00",
        sequence: 1,
      },
      {
        tripId: "T1",
        stationId: "ST2",
        feedId: FEED_ID,
        arrivalTime: "25:05:00",
        departureTime: "25:05:00",
        sequence: 2,
      },
    ]);
    await container.db
      .insert(fgvStationIds)
      .values([{ stationId: "ST1", feedId: LINK_FEED_ID, fgvStationId: 42 }]);
  });

  afterAll(async () => {
    await clearDatabase(container.db);
    await container.dispose();
  });

  const failures: Array<[string, () => FgvFetch]> = [
    ["HTTP 500", () => () => Promise.resolve(new Response("boom", { status: 500 }))],
    ["network error", () => () => Promise.reject(new TypeError("fetch failed"))],
    [
      "hung request",
      () => (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    ],
  ];

  for (const [label, makeFetch] of failures) {
    it(`should reply with the normal scheduled reply when FGV fails (${label})`, async () => {
      fgvFetch = makeFetch();

      await bot.handleUpdate(makeCommandUpdate("/salida Colón - Xàtiva"));

      expect(fgvCalls).toBeGreaterThan(0);
      expect(replies).toHaveLength(1);
      const reply = replies[0]!;
      expect(reply).toContain("🚇 <b>Colón → Xàtiva</b>");
      expect(reply).toContain("🕒 <b>01:00</b>");
      expect(reply).toContain("→ Xàtiva");
      expect(reply).not.toContain("📡");
      expect(reply).not.toContain("❌");
    });
  }
});
