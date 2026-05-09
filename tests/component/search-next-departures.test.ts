import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { createContainer, type Container } from "@/adapters/container";
import { clearDatabase } from "../helpers/db";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";
import { StationId } from "@/core/domain/station/StationId";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";
import {
  stations,
  routes,
  lines,
  lineStations,
  schedules,
  scheduleExceptions,
  trips,
  passingTimes,
} from "@/adapters/out/persistence/drizzle/schema";

const FEED_ID = "FV1";

describe("SearchNextDepartures Component Test", () => {
  let container: Container;

  beforeAll(() => {
    container = createContainer();
  });

  beforeEach(async () => {
    await clearDatabase(container.db);

    // Stations: ST1 "Colón", ST2 "Xàtiva"
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

    // Lines (commercial): must be inserted before routes due to FK
    await container.db.insert(lines).values([
      { id: "L1", feedId: FEED_ID, name: "Línea 1 Anada", transportType: "metro" },
      { id: "L2", feedId: FEED_ID, name: "Línea 1 Tornada", transportType: "metro" },
    ]);

    // Routes (operational): one per direction, linked to their commercial line
    await container.db.insert(routes).values([
      { id: "L1", feedId: FEED_ID, transportType: "metro", lineId: "L1" },
      { id: "L2", feedId: FEED_ID, transportType: "metro", lineId: "L2" },
    ]);

    await container.db.insert(lineStations).values([
      { lineId: "L1", stationId: "ST1", feedId: FEED_ID, sequence: 1 },
      { lineId: "L1", stationId: "ST2", feedId: FEED_ID, sequence: 2 },
      { lineId: "L2", stationId: "ST2", feedId: FEED_ID, sequence: 1 },
      { lineId: "L2", stationId: "ST1", feedId: FEED_ID, sequence: 2 },
    ]);

    // Schedule: WD — weekdays only, range 2024-01-01 to 2024-12-31
    await container.db.insert(schedules).values([
      {
        id: "WD",
        feedId: FEED_ID,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      },
    ]);

    // schedule_exceptions: WD active on 2024-06-03 (Monday used in tests)
    await container.db
      .insert(scheduleExceptions)
      .values([{ scheduleId: "WD", feedId: FEED_ID, date: "2024-06-03", isActive: true }]);

    // Trips: T1 on route L1/WD headsign "Xàtiva", T2 on route L2/WD headsign "Colón"
    await container.db.insert(trips).values([
      { id: "T1", feedId: FEED_ID, routeId: "L1", scheduleId: "WD", headsign: "Xàtiva" },
      { id: "T2", feedId: FEED_ID, routeId: "L2", scheduleId: "WD", headsign: "Colón" },
    ]);

    // Passing times: T1 ST1(06:00)→ST2(06:05), T2 ST2(06:10)→ST1(06:15)
    await container.db.insert(passingTimes).values([
      {
        tripId: "T1",
        stationId: "ST1",
        feedId: FEED_ID,
        arrivalTime: "06:00:00",
        departureTime: "06:00:00",
        sequence: 1,
      },
      {
        tripId: "T1",
        stationId: "ST2",
        feedId: FEED_ID,
        arrivalTime: "06:05:00",
        departureTime: "06:05:00",
        sequence: 2,
      },
      {
        tripId: "T2",
        stationId: "ST2",
        feedId: FEED_ID,
        arrivalTime: "06:10:00",
        departureTime: "06:10:00",
        sequence: 1,
      },
      {
        tripId: "T2",
        stationId: "ST1",
        feedId: FEED_ID,
        arrivalTime: "06:15:00",
        departureTime: "06:15:00",
        sequence: 2,
      },
    ]);
  });

  afterAll(async () => {
    await clearDatabase(container.db);
    await container.dispose();
  });

  it("should return next departure from Colón to Xàtiva on a weekday", async () => {
    const now = new Date("2024-06-03T03:55:00Z"); // 03:55 UTC = 05:55 Madrid (CEST); // Monday
    const useCase = new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.routeRepository,
      container.eventBus,
    );

    const result = await useCase.execute("Colón", "Xàtiva", now);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    expect(result.data.departures).toHaveLength(1);
    expect(result.data.departures[0]!.departureTime.value).toBe("06:00:00");
    expect(result.data.departures[0]!.headsign).toBe("Xàtiva");
  });

  it("should return next departure from Xàtiva to Colón on a weekday", async () => {
    const now = new Date("2024-06-03T04:05:00Z"); // 04:05 UTC = 06:05 Madrid (CEST); // Monday
    const useCase = new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.routeRepository,
      container.eventBus,
    );

    const result = await useCase.execute("Xàtiva", "Colón", now);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    expect(result.data.departures).toHaveLength(1);
    expect(result.data.departures[0]!.departureTime.value).toBe("06:10:00");
    expect(result.data.departures[0]!.headsign).toBe("Colón");
  });

  it("should throw NoActiveServiceError on a Saturday", async () => {
    const now = new Date("2024-06-01T03:55:00Z"); // 03:55 UTC = 05:55 Madrid (CEST); // Saturday
    const useCase = new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.routeRepository,
      container.eventBus,
    );

    await expect(useCase.execute("Colón", "Xàtiva", now)).rejects.toBeInstanceOf(
      NoActiveServiceError,
    );
  });

  it("should throw StationNotFoundError for unknown station", async () => {
    const now = new Date("2024-06-03T03:55:00Z"); // 03:55 UTC = 05:55 Madrid (CEST); // Monday
    const useCase = new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.routeRepository,
      container.eventBus,
    );

    await expect(useCase.execute("Unknown", "Colón", now)).rejects.toBeInstanceOf(
      StationNotFoundError,
    );
  });

  it("should return crossover trip first when queried at 00:05 with no prior service today", async () => {
    // Insert yesterday's schedule with exception on 2024-06-02
    await container.db.insert(schedules).values([
      {
        id: "YD",
        feedId: FEED_ID,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      },
    ]);
    await container.db
      .insert(scheduleExceptions)
      .values([{ scheduleId: "YD", feedId: FEED_ID, date: "2024-06-02", isActive: true }]);

    // Yesterday's trip: departure 24:20 from ST1→ST2
    await container.db
      .insert(trips)
      .values([
        { id: "TY1", feedId: FEED_ID, routeId: "L1", scheduleId: "YD", headsign: "Xàtiva" },
      ]);
    await container.db.insert(passingTimes).values([
      {
        tripId: "TY1",
        stationId: "ST1",
        feedId: FEED_ID,
        arrivalTime: "24:20:00",
        departureTime: "24:20:00",
        sequence: 1,
      },
      {
        tripId: "TY1",
        stationId: "ST2",
        feedId: FEED_ID,
        arrivalTime: "24:25:00",
        departureTime: "24:25:00",
        sequence: 2,
      },
    ]);

    // Today's trip: departure 06:00 from ST1→ST2 (existing T1 in beforeEach, already inserted)
    // now = 2024-06-03T22:05:00Z = 00:05 Madrid CEST (UTC+2), UTC date "2024-06-03"
    const now = new Date("2024-06-03T22:05:00Z");

    const useCase = new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.routeRepository,
      container.eventBus,
    );

    const result = await useCase.execute("Colón", "Xàtiva", now);

    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;
    // Crossover trip (24:20, ~15 min) must come before today's trip (06:00, ~348 min)
    expect(result.data.departures[0]!.departureTime.value).toBe("24:20:00");
    expect(result.data.departures[0]!.minutesRemaining).toBeGreaterThan(0);
    expect(result.data.departures[1]!.departureTime.value).toBe("06:00:00");
  });

  it("should return true for hasServiceStarted when a past departure exists today", async () => {
    // Trip with departure 05:00 from ST1, querying at 06:30 → service has started
    await container.db
      .insert(trips)
      .values([
        { id: "T_PAST", feedId: FEED_ID, routeId: "L1", scheduleId: "WD", headsign: "Xàtiva" },
      ]);
    await container.db.insert(passingTimes).values([
      {
        tripId: "T_PAST",
        stationId: "ST1",
        feedId: FEED_ID,
        arrivalTime: "05:00:00",
        departureTime: "05:00:00",
        sequence: 1,
      },
      {
        tripId: "T_PAST",
        stationId: "ST2",
        feedId: FEED_ID,
        arrivalTime: "05:05:00",
        departureTime: "05:05:00",
        sequence: 2,
      },
    ]);

    // 06:30 Madrid CEST (UTC+2) = 04:30 UTC. UTC date "2024-06-03" → schedule "WD" is active.
    const now = new Date("2024-06-03T04:30:00Z");
    const activeIds = (await container.scheduleRepository.findActiveOn(now)).map((s) => s.id);
    const before = new TimeOfDay("06:30:00");

    const started = await container.tripRepository.hasServiceStarted(
      new StationId("ST1"),
      before,
      activeIds,
    );
    expect(started).toBe(true);
  });

  it("should return false for hasServiceStarted when only future departures exist today", async () => {
    // T1 in beforeEach has departure 06:00 from ST1. Querying at 05:00 → no past departures.
    const now = new Date("2024-06-03T03:00:00Z"); // 05:00 Madrid CEST
    const activeIds = (await container.scheduleRepository.findActiveOn(now)).map((s) => s.id);
    const before = new TimeOfDay("05:00:00");

    const started = await container.tripRepository.hasServiceStarted(
      new StationId("ST1"),
      before,
      activeIds,
    );
    expect(started).toBe(false);
  });

  it("should not return duplicate entries for the same trip time", async () => {
    // Insert yesterday's schedule with exception on 2024-06-02
    await container.db.insert(schedules).values([
      {
        id: "YD2",
        feedId: FEED_ID,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      },
    ]);
    await container.db
      .insert(scheduleExceptions)
      .values([{ scheduleId: "YD2", feedId: FEED_ID, date: "2024-06-02", isActive: true }]);

    // Yesterday trip at 24:16 ST1→ST2
    await container.db.insert(trips).values([
      {
        id: "TY_DUP_YEST",
        feedId: FEED_ID,
        routeId: "L1",
        scheduleId: "YD2",
        headsign: "Xàtiva",
      },
    ]);
    await container.db.insert(passingTimes).values([
      {
        tripId: "TY_DUP_YEST",
        stationId: "ST1",
        feedId: FEED_ID,
        arrivalTime: "24:16:00",
        departureTime: "24:16:00",
        sequence: 1,
      },
      {
        tripId: "TY_DUP_YEST",
        stationId: "ST2",
        feedId: FEED_ID,
        arrivalTime: "24:21:00",
        departureTime: "24:21:00",
        sequence: 2,
      },
    ]);

    // Today trip at 24:16 ST1→ST2 — same clock time, different schedule
    await container.db.insert(trips).values([
      {
        id: "TY_DUP_TODAY",
        feedId: FEED_ID,
        routeId: "L1",
        scheduleId: "WD",
        headsign: "Xàtiva",
      },
    ]);
    await container.db.insert(passingTimes).values([
      {
        tripId: "TY_DUP_TODAY",
        stationId: "ST1",
        feedId: FEED_ID,
        arrivalTime: "24:16:00",
        departureTime: "24:16:00",
        sequence: 1,
      },
      {
        tripId: "TY_DUP_TODAY",
        stationId: "ST2",
        feedId: FEED_ID,
        arrivalTime: "24:21:00",
        departureTime: "24:21:00",
        sequence: 2,
      },
    ]);

    // now = 00:05 Madrid
    const now = new Date("2024-06-03T22:05:00Z");
    const useCase = new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.routeRepository,
      container.eventBus,
    );

    const result = await useCase.execute("Colón", "Xàtiva", now);
    expect(result.type).toBe("departures");
    if (result.type !== "departures") return;

    // The crossover trip (24:16 yesterday, ~11 min) and today's 24:16 (1451 min) are different
    // entries. Verify no two departures have the same ~11 min remaining (i.e., no duplicates
    // of the crossover trip).
    const shortEntries = result.data.departures.filter((d) => d.minutesRemaining < 60);
    expect(shortEntries).toHaveLength(1);
    expect(shortEntries[0]!.departureTime.value).toBe("24:16:00");
  });
});
