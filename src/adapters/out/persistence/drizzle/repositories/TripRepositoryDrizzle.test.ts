import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { TripRepositoryDrizzle } from "./TripRepositoryDrizzle";
import { LineId } from "@/core/domain/line/LineId";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { StationId } from "@/core/domain/station/StationId";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";
import { stations, lines, schedules, trips, passingTimes } from "../schema";
import { createTestSetup } from "./test-db-helper";

const FEED_ID = "metrovalencia";
const { db, cleanDatabase, closeDatabase } = createTestSetup();

describe("TripRepositoryDrizzle", () => {
  let repo: TripRepositoryDrizzle;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new TripRepositoryDrizzle(db);

    // FK dependencies: stations, lines, schedules must exist first
    await db.insert(stations).values([
      { id: "ST1", feedId: FEED_ID, name: "Colón", latitude: 39.47, longitude: -0.37, transportType: "metro" },
      { id: "ST2", feedId: FEED_ID, name: "Xàtiva", latitude: 39.46, longitude: -0.38, transportType: "metro" },
    ]);

    await db.insert(lines).values([
      { id: "L1", feedId: FEED_ID, name: "Línia 1", shortName: "1", transportType: "metro" },
    ]);

    await db.insert(schedules).values([
      {
        id: "SC1",
        feedId: FEED_ID,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      },
      {
        id: "SC2",
        feedId: FEED_ID,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: true,
        sunday: true,
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      },
    ]);

    await db.insert(trips).values([
      { id: "TR1", feedId: FEED_ID, lineId: "L1", scheduleId: "SC1", direction: "OUTBOUND", headsign: "Colón" },
      { id: "TR2", feedId: FEED_ID, lineId: "L1", scheduleId: "SC1", direction: "OUTBOUND", headsign: "Colón" },
      { id: "TR3", feedId: FEED_ID, lineId: "L1", scheduleId: "SC2", direction: "OUTBOUND", headsign: "Colón" },
    ]);

    await db.insert(passingTimes).values([
      { tripId: "TR1", stationId: "ST1", feedId: FEED_ID, arrivalTime: "08:00:00", departureTime: "08:00:00", sequence: 1 },
      { tripId: "TR1", stationId: "ST2", feedId: FEED_ID, arrivalTime: "08:05:00", departureTime: "08:05:00", sequence: 2 },
      { tripId: "TR2", stationId: "ST1", feedId: FEED_ID, arrivalTime: "09:00:00", departureTime: "09:00:00", sequence: 1 },
      { tripId: "TR2", stationId: "ST2", feedId: FEED_ID, arrivalTime: "09:05:00", departureTime: "09:05:00", sequence: 2 },
      { tripId: "TR3", stationId: "ST1", feedId: FEED_ID, arrivalTime: "10:00:00", departureTime: "10:00:00", sequence: 1 },
    ]);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("should return trips for given line and schedule", async () => {
    const result = await repo.findByLineAndSchedule(new LineId("L1"), new ScheduleId("SC1"));

    expect(result.length).toBe(2);
    const ids = result.map((t) => t.id.value).sort();
    expect(ids).toEqual(["TR1", "TR2"]);
  });

  it("should return empty array when no trips match the given line and schedule", async () => {
    const result = await repo.findByLineAndSchedule(new LineId("L1"), new ScheduleId("NONE"));

    expect(result).toEqual([]);
  });

  it("should return trips departing from station after given time with active schedules", async () => {
    // After 08:30, TR1 (08:00) is excluded, TR2 (09:00) is included; SC1 is active
    const result = await repo.findDeparturesFromStation(
      new StationId("ST1"),
      new TimeOfDay("08:30:00"),
      [new ScheduleId("SC1")],
    );

    expect(result.length).toBe(1);
    expect(result[0]!.id.value).toBe("TR2");
  });

  it("should return all matching trips after given time across multiple active schedules", async () => {
    // After 07:00, both SC1 trips (08:00 and 09:00) and SC2 trip (10:00) qualify
    const result = await repo.findDeparturesFromStation(
      new StationId("ST1"),
      new TimeOfDay("07:00:00"),
      [new ScheduleId("SC1"), new ScheduleId("SC2")],
    );

    expect(result.length).toBe(3);
  });

  it("should return empty array when no active schedules are provided", async () => {
    const result = await repo.findDeparturesFromStation(
      new StationId("ST1"),
      new TimeOfDay("07:00:00"),
      [],
    );

    expect(result).toEqual([]);
  });

  it("should return empty array when no departures exist after given time", async () => {
    const result = await repo.findDeparturesFromStation(
      new StationId("ST1"),
      new TimeOfDay("23:00:00"),
      [new ScheduleId("SC1")],
    );

    expect(result).toEqual([]);
  });
});
