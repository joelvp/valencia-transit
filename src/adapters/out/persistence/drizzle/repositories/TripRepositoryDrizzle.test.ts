import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { TripRepositoryDrizzle } from "./TripRepositoryDrizzle";
import { Trip } from "@/core/domain/trip/Trip";
import { TripId } from "@/core/domain/trip/TripId";
import { LineId } from "@/core/domain/line/LineId";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { StationId } from "@/core/domain/station/StationId";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";
import { PassingTime } from "@/core/domain/trip/PassingTime";
import { stations, lines, schedules, trips, passingTimes } from "../schema";
import { createTestSetup } from "./test-db-helper";
import { StationMother } from "./mothers/StationMother";
import { LineMother } from "./mothers/LineMother";
import { ScheduleMother } from "./mothers/ScheduleMother";
import { TripMother } from "./mothers/TripMother";

const FEED_ID = "metrovalencia";
const { db, cleanDatabase, closeDatabase } = createTestSetup();

describe("TripRepositoryDrizzle", () => {
  let repo: TripRepositoryDrizzle;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new TripRepositoryDrizzle(db);

    // FK dependencies: stations, lines, schedules must exist first
    await db.insert(stations).values([
      StationMother.row(),
      StationMother.row({ id: "ST2", name: "Xàtiva", longitude: -0.38 }),
    ]);

    await db.insert(lines).values([LineMother.row()]);

    await db.insert(schedules).values([ScheduleMother.row(), ScheduleMother.weekendRow()]);

    await db.insert(trips).values([
      TripMother.row({ id: "TR1", scheduleId: "SC1" }),
      TripMother.row({ id: "TR2", scheduleId: "SC1" }),
      TripMother.row({ id: "TR3", scheduleId: "SC2" }),
    ]);

    await db.insert(passingTimes).values([
      TripMother.passingTimeRow({ tripId: "TR1", stationId: "ST1", arrivalTime: "08:00:00", departureTime: "08:00:00", sequence: 1 }),
      TripMother.passingTimeRow({ tripId: "TR1", stationId: "ST2", arrivalTime: "08:05:00", departureTime: "08:05:00", sequence: 2 }),
      TripMother.passingTimeRow({ tripId: "TR2", stationId: "ST1", arrivalTime: "09:00:00", departureTime: "09:00:00", sequence: 1 }),
      TripMother.passingTimeRow({ tripId: "TR2", stationId: "ST2", arrivalTime: "09:05:00", departureTime: "09:05:00", sequence: 2 }),
      TripMother.passingTimeRow({ tripId: "TR3", stationId: "ST1", arrivalTime: "10:00:00", departureTime: "10:00:00", sequence: 1 }),
    ]);
  });

  afterAll(async () => {
    await cleanDatabase();
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

  it("should insert trip with passing times and allow retrieval after save", async () => {
    const trip = new Trip(
      new TripId("TR99"),
      new LineId("L1"),
      new ScheduleId("SC1"),
      [
        new PassingTime(new StationId("ST1"), new TimeOfDay("12:00:00"), new TimeOfDay("12:00:00"), 1),
        new PassingTime(new StationId("ST2"), new TimeOfDay("12:05:00"), new TimeOfDay("12:05:00"), 2),
      ],
    );

    await repo.save(trip, FEED_ID);

    const result = await repo.findByLineAndSchedule(new LineId("L1"), new ScheduleId("SC1"));
    const saved = result.find((t) => t.id.value === "TR99");
    expect(saved).not.toBeUndefined();
    expect(saved!.passingTimes.length).toBe(2);
  });

  it("should upsert without error when saving an already-existing trip", async () => {
    const trip = new Trip(
      new TripId("TR1"),
      new LineId("L1"),
      new ScheduleId("SC1"),
      [],
    );

    await repo.save(trip, FEED_ID);

    const result = await repo.findByLineAndSchedule(new LineId("L1"), new ScheduleId("SC1"));
    const updated = result.find((t) => t.id.value === "TR1");
    expect(updated).not.toBeUndefined();
  });

  it("should remove all trips for the given feedId", async () => {
    await repo.deleteByFeedId(FEED_ID);

    const rows = await db.select().from(trips);
    expect(rows).toEqual([]);
  });

  it("should not remove trips belonging to a different feedId", async () => {
    const OTHER_FEED = "other-feed";
    await db.insert(stations).values([
      StationMother.row({ id: "STO1", feedId: OTHER_FEED, name: "Other Station", latitude: 39.5, longitude: -0.4 }),
    ]);
    await db.insert(lines).values([
      LineMother.row({ id: "LO1", feedId: OTHER_FEED, name: "Other Line", shortName: "O" }),
    ]);
    await db.insert(schedules).values([ScheduleMother.row({ id: "SCO1", feedId: OTHER_FEED })]);
    await db.insert(trips).values([
      TripMother.row({ id: "TRO1", feedId: OTHER_FEED, lineId: "LO1", scheduleId: "SCO1", headsign: "Other" }),
    ]);

    await repo.deleteByFeedId(FEED_ID);

    const rows = await db.select().from(trips);
    expect(rows.length).toBe(1);
    expect(rows[0]!.feedId).toBe(OTHER_FEED);
  });
});
