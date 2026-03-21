import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import type { Update, UserFromGetMe } from "grammy/types";
import { createContainer, type Container } from "@/adapters/container";
import { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { ListStationsWithLines } from "@/core/application/query/ListStationsWithLines";
import { TelegramBot } from "@/adapters/in/telegram/TelegramBot";
import { clearDatabase } from "../helpers/db";
import {
  stations,
  lines,
  lineStations,
  schedules,
  scheduleExceptions,
  trips,
  passingTimes,
} from "@/adapters/out/persistence/drizzle/schema";

const FEED_ID = "FV1";

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

function makeTextUpdate(text: string, chatId = 1): Update {
  return {
    update_id: 2,
    message: {
      message_id: 2,
      date: Math.floor(Date.now() / 1000),
      chat: { id: chatId, type: "private", first_name: "Test" },
      from: { id: chatId, is_bot: false, first_name: "Test" },
      text,
    },
  };
}

describe("TelegramBot E2E", () => {
  let container: Container;
  let bot: TelegramBot;
  let replies: string[];

  beforeAll(() => {
    container = createContainer();

    const searchNextDepartures = new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.eventBus,
    );
    const listStationsWithLines = new ListStationsWithLines(
      container.stationRepository,
      container.lineRepository,
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

    bot = new TelegramBot("fake-token-for-testing", searchNextDepartures, listStationsWithLines, {
      botInfo: fakeBotInfo,
    });

    replies = [];
    bot["bot"].api.config.use((prev, method, payload) => {
      if (method === "sendMessage") {
        replies.push((payload as { text: string }).text);
      }
      return Promise.resolve({ ok: true, result: true } as never);
    });
  });

  beforeEach(async () => {
    await clearDatabase(container.db);
    replies = [];

    // Stations: ST1 "Colón", ST2 "Xàtiva", ST3 "Àngel Guimerà"
    await container.db.insert(stations).values([
      {
        id: "ST1",
        feedId: FEED_ID,
        name: "Colón",
        latitude: 39.4682,
        longitude: -0.3765,
        transportType: "metro",
      },
      {
        id: "ST2",
        feedId: FEED_ID,
        name: "Xàtiva",
        latitude: 39.4676,
        longitude: -0.3789,
        transportType: "metro",
      },
      {
        id: "ST3",
        feedId: FEED_ID,
        name: "Àngel Guimerà",
        latitude: 39.4661,
        longitude: -0.381,
        transportType: "metro",
      },
      {
        id: "ST1b",
        feedId: FEED_ID,
        name: "Colón",
        latitude: 39.4683,
        longitude: -0.3766,
        transportType: "metro",
      },
    ]);

    // Lines: L1 (ST2→ST1), L2 (ST1→ST2)
    await container.db.insert(lines).values([
      {
        id: "L1",
        feedId: FEED_ID,
        name: "1",
        shortName: "1",
        transportType: "metro",
        color: "FEC601",
      },
      {
        id: "L2",
        feedId: FEED_ID,
        name: "1",
        shortName: "1",
        transportType: "metro",
        color: "FEC601",
      },
    ]);

    await container.db.insert(lineStations).values([
      { lineId: "L1", stationId: "ST2", feedId: FEED_ID, sequence: 1 },
      { lineId: "L1", stationId: "ST1", feedId: FEED_ID, sequence: 2 },
      { lineId: "L2", stationId: "ST1", feedId: FEED_ID, sequence: 1 },
      { lineId: "L2", stationId: "ST2", feedId: FEED_ID, sequence: 2 },
    ]);

    // Schedule: active every day, wide date range
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

    // schedule_exceptions: WD active today (dynamic — departureHandler uses new Date())
    const today = new Date().toISOString().split("T")[0]!;
    await container.db
      .insert(scheduleExceptions)
      .values([{ scheduleId: "WD", feedId: FEED_ID, date: today, isActive: true }]);

    // Trips: T1 on L1 (Xàtiva→Colón), T2 on L2 (Colón→Xàtiva)
    await container.db.insert(trips).values([
      { id: "T1", feedId: FEED_ID, lineId: "L1", scheduleId: "WD", headsign: "Colón" },
      { id: "T2", feedId: FEED_ID, lineId: "L2", scheduleId: "WD", headsign: "Xàtiva" },
    ]);

    // Passing times using GTFS next-day notation (25:xx) so they are always "next"
    await container.db.insert(passingTimes).values([
      {
        tripId: "T1",
        stationId: "ST2",
        feedId: FEED_ID,
        arrivalTime: "25:00:00",
        departureTime: "25:00:00",
        sequence: 1,
      },
      {
        tripId: "T1",
        stationId: "ST1",
        feedId: FEED_ID,
        arrivalTime: "25:05:00",
        departureTime: "25:05:00",
        sequence: 2,
      },
      {
        tripId: "T2",
        stationId: "ST1",
        feedId: FEED_ID,
        arrivalTime: "25:10:00",
        departureTime: "25:10:00",
        sequence: 1,
      },
      {
        tripId: "T2",
        stationId: "ST2",
        feedId: FEED_ID,
        arrivalTime: "25:15:00",
        departureTime: "25:15:00",
        sequence: 2,
      },
    ]);
  });

  afterAll(async () => {
    await clearDatabase(container.db);
    await container.dispose();
  });

  it("should reply with formatted departures for /salida Xàtiva Colón", async () => {
    await bot.handleUpdate(makeCommandUpdate("/salida Xàtiva Colón"));

    expect(replies).toHaveLength(1);
    const reply = replies[0]!;

    // Header with origin → destination and duration
    expect(reply).toContain("🚇 <b>Xàtiva → Colón</b>");
    expect(reply).toContain("(~5 min)");

    // Próximas salidas label
    expect(reply).toContain("Próximas salidas:");

    // Departure row: time, line color emoji, line name, headsign
    expect(reply).toContain("25:00");
    expect(reply).toContain("🟡");
    expect(reply).toContain("→ Colón");
  });

  it("should reply with station not found for /salida Desconocida Colón", async () => {
    await bot.handleUpdate(makeCommandUpdate("/salida Desconocida Colón"));

    expect(replies).toHaveLength(1);
    expect(replies[0]!).toContain("❌ Estación no encontrada");
  });

  it("should reply with usage hint for /salida with no args", async () => {
    await bot.handleUpdate(makeCommandUpdate("/salida"));

    expect(replies).toHaveLength(1);
    expect(replies[0]!).toContain("Uso:");
  });

  it("should reply with station list with lines for /paradas", async () => {
    await bot.handleUpdate(makeCommandUpdate("/paradas"));

    expect(replies).toHaveLength(1);
    const reply = replies[0]!;

    // All distinct station names present
    expect(reply).toContain("Xàtiva");
    expect(reply).toContain("Àngel Guimerà");

    // Colón has lines — deduped by name ("1"), shown as L1
    expect(reply).toContain("Colón  🟡 L1");

    // No duplicates: "Colón" appears exactly once (ST1 and ST1b merged by name)
    const colonOccurrences = reply.split("Colón  🟡").length - 1;
    expect(colonOccurrences).toBe(1);
  });

  it("should reply with help text for /help", async () => {
    await bot.handleUpdate(makeCommandUpdate("/help"));

    expect(replies).toHaveLength(1);
    const reply = replies[0]!;
    expect(reply).toContain("/salida");
    expect(reply).toContain("/paradas");
  });

  it("should reply with same departures for free-text 'Xàtiva - Colón' as for /salida command", async () => {
    await bot.handleUpdate(makeCommandUpdate("/salida Xàtiva - Colón"));
    const commandReply = replies[0]!;
    replies = [];

    await bot.handleUpdate(makeTextUpdate("Xàtiva - Colón"));
    const freeTextReply = replies[0]!;

    expect(replies).toHaveLength(1);
    expect(freeTextReply).toContain("🚇 <b>Xàtiva → Colón</b>");
    expect(freeTextReply).toContain("Próximas salidas:");
    expect(freeTextReply).toContain("25:00");
    expect(freeTextReply).toContain("🟡");
    expect(freeTextReply).toBe(commandReply);
  });
});
