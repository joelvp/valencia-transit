import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { SearchNextDepartures } from "@/core/application/query/SearchNextDepartures";
import { createContainer, type Container } from "@/adapters/container";
import { clearDatabase } from "../helpers/db";
import { StationNotFoundError } from "@/core/domain/error/StationNotFoundError";
import { NoActiveServiceError } from "@/core/domain/error/NoActiveServiceError";
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
    ]);

    // Lines: L1 (ST1→ST2), L2 (ST2→ST1)
    await container.db.insert(lines).values([
      { id: "L1", feedId: FEED_ID, name: "Línea 1 Anada", shortName: "1", transportType: "metro" },
      {
        id: "L2",
        feedId: FEED_ID,
        name: "Línea 1 Tornada",
        shortName: "1",
        transportType: "metro",
      },
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

    // Trips: T1 on L1/WD headsign "Xàtiva", T2 on L2/WD headsign "Colón"
    await container.db.insert(trips).values([
      { id: "T1", feedId: FEED_ID, lineId: "L1", scheduleId: "WD", headsign: "Xàtiva" },
      { id: "T2", feedId: FEED_ID, lineId: "L2", scheduleId: "WD", headsign: "Colón" },
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
    const now = new Date("2024-06-03T03:55:00Z") // 03:55 UTC = 05:55 Madrid (CEST); // Monday
    const useCase = new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
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
    const now = new Date("2024-06-03T04:05:00Z") // 04:05 UTC = 06:05 Madrid (CEST); // Monday
    const useCase = new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
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
    const now = new Date("2024-06-01T03:55:00Z") // 03:55 UTC = 05:55 Madrid (CEST); // Saturday
    const useCase = new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.eventBus,
    );

    await expect(useCase.execute("Colón", "Xàtiva", now)).rejects.toBeInstanceOf(
      NoActiveServiceError,
    );
  });

  it("should throw StationNotFoundError for unknown station", async () => {
    const now = new Date("2024-06-03T03:55:00Z") // 03:55 UTC = 05:55 Madrid (CEST); // Monday
    const useCase = new SearchNextDepartures(
      container.stationRepository,
      container.lineRepository,
      container.scheduleRepository,
      container.tripRepository,
      container.eventBus,
    );

    await expect(useCase.execute("Unknown", "Colón", now)).rejects.toBeInstanceOf(
      StationNotFoundError,
    );
  });
});
