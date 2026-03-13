import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { LineRepositoryDrizzle } from "./LineRepositoryDrizzle";
import { LineId } from "@/core/domain/line/LineId";
import { StationId } from "@/core/domain/station/StationId";
import { stations, lines, lineStations } from "../schema";
import { createTestSetup } from "./test-db-helper";

const FEED_ID = "metrovalencia";
const { db, cleanDatabase, closeDatabase } = createTestSetup();

describe("LineRepositoryDrizzle", () => {
  let repo: LineRepositoryDrizzle;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new LineRepositoryDrizzle(db);

    await db.insert(stations).values([
      { id: "ST1", feedId: FEED_ID, name: "Colón", latitude: 39.47, longitude: -0.37, transportType: "metro" },
      { id: "ST2", feedId: FEED_ID, name: "Xàtiva", latitude: 39.46, longitude: -0.38, transportType: "metro" },
      { id: "ST3", feedId: FEED_ID, name: "Alameda", latitude: 39.48, longitude: -0.36, transportType: "metro" },
    ]);

    await db.insert(lines).values([
      { id: "L1", feedId: FEED_ID, name: "Línia 1", shortName: "1", transportType: "metro" },
      { id: "L2", feedId: FEED_ID, name: "Línia 2", shortName: "2", transportType: "metro" },
    ]);

    await db.insert(lineStations).values([
      { lineId: "L1", stationId: "ST1", feedId: FEED_ID, sequence: 1, direction: "OUTBOUND" },
      { lineId: "L1", stationId: "ST2", feedId: FEED_ID, sequence: 2, direction: "OUTBOUND" },
      { lineId: "L2", stationId: "ST2", feedId: FEED_ID, sequence: 1, direction: "OUTBOUND" },
      { lineId: "L2", stationId: "ST3", feedId: FEED_ID, sequence: 2, direction: "OUTBOUND" },
    ]);
  });

  afterAll(async () => {
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
});
