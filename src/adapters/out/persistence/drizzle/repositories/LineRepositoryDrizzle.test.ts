import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { LineRepositoryDrizzle } from "./LineRepositoryDrizzle";
import { LineId } from "@/core/domain/line/LineId";
import { LineName } from "@/core/domain/line/LineName";
import { LineStop } from "@/core/domain/line/LineStop";
import { Line } from "@/core/domain/line/Line";
import { StationId } from "@/core/domain/station/StationId";
import { stations, lines, lineStations } from "../schema";
import { createTestSetup } from "./test-db-helper";
import { StationMother } from "./mothers/StationMother";
import { LineMother } from "./mothers/LineMother";

const FEED_ID = "metrovalencia";
const { db, cleanDatabase, closeDatabase } = createTestSetup();

describe("LineRepositoryDrizzle", () => {
  let repo: LineRepositoryDrizzle;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new LineRepositoryDrizzle(db);

    await db.insert(stations).values([
      StationMother.row(),
      StationMother.row({ id: "ST2", name: "Xàtiva", longitude: -0.38 }),
      StationMother.row({ id: "ST3", name: "Alameda", latitude: 39.48, longitude: -0.36 }),
    ]);

    await db.insert(lines).values([
      LineMother.row(),
      LineMother.row({ id: "L2", name: "Línia 2", shortName: "2" }),
    ]);

    await db.insert(lineStations).values([
      LineMother.stopRow({ stationId: "ST1", sequence: 1 }),
      LineMother.stopRow({ stationId: "ST2", sequence: 2 }),
      LineMother.stopRow({ lineId: "L2", stationId: "ST2", sequence: 1 }),
      LineMother.stopRow({ lineId: "L2", stationId: "ST3", sequence: 2 }),
    ]);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  it("should return line with its stops when found by id", async () => {
    const result = await repo.findById(new LineId("L1"));

    expect(result).not.toBeNull();
    expect(result!.id.value).toBe("L1");
    expect(result!.stops.length).toBe(2);
  });

  it("should return null when line id does not exist", async () => {
    const result = await repo.findById(new LineId("NONE"));

    expect(result).toBeNull();
  });

  it("should return lines connecting both stations", async () => {
    const result = await repo.findByStations(new StationId("ST1"), new StationId("ST2"));

    expect(result.length).toBe(1);
    expect(result[0]!.id.value).toBe("L1");
  });

  it("should return empty array when no line connects the given stations", async () => {
    const result = await repo.findByStations(new StationId("ST1"), new StationId("ST3"));

    expect(result).toEqual([]);
  });

  it("should return all lines with their stops", async () => {
    const result = await repo.findAll();

    expect(result.length).toBe(2);
    const ids = result.map((l) => l.id.value).sort();
    expect(ids).toEqual(["L1", "L2"]);
    result.forEach((line) => {
      expect(line.stops.length).toBeGreaterThan(0);
    });
  });

  it("should insert line with stops and allow retrieval after save", async () => {
    const line = new Line(
      new LineId("L3"),
      new LineName("Línia 3"),
      [new LineStop(new StationId("ST1"), 1), new LineStop(new StationId("ST3"), 2)],
    );

    await repo.save(line, FEED_ID);

    const result = await repo.findById(new LineId("L3"));
    expect(result).not.toBeNull();
    expect(result!.id.value).toBe("L3");
    expect(result!.stops.length).toBe(2);
  });

  it("should upsert without error when saving an already-existing line", async () => {
    const line = new Line(
      new LineId("L1"),
      new LineName("Línia 1 Updated"),
      [new LineStop(new StationId("ST1"), 1)],
    );

    await repo.save(line, FEED_ID);

    const result = await repo.findById(new LineId("L1"));
    expect(result).not.toBeNull();
    expect(result!.name.value).toBe("Línia 1 Updated");
  });

  it("should remove all lines and their stops for the given feedId", async () => {
    await repo.deleteByFeedId(FEED_ID);

    const result = await repo.findAll();
    expect(result).toEqual([]);
  });

  it("should not remove lines belonging to a different feedId", async () => {
    const OTHER_FEED = "other-feed";
    await db.insert(stations).values([
      StationMother.row({ id: "STO1", feedId: OTHER_FEED, name: "Other Station", latitude: 39.5, longitude: -0.4 }),
    ]);
    await db.insert(lines).values([
      LineMother.row({ id: "LO1", feedId: OTHER_FEED, name: "Other Line", shortName: "O" }),
    ]);

    await repo.deleteByFeedId(FEED_ID);

    const rows = await db.select().from(lines);
    expect(rows.length).toBe(1);
    expect(rows[0]!.feedId).toBe(OTHER_FEED);
  });
});
