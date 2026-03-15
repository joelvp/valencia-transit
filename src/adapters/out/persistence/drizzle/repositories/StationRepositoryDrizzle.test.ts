import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { StationRepositoryDrizzle } from "./StationRepositoryDrizzle";
import { StationId } from "@/core/domain/station/StationId";
import { stations } from "../schema";
import { createTestSetup } from "./test-db-helper";

const FEED_ID = "metrovalencia";
const { db, cleanDatabase, closeDatabase } = createTestSetup();

const stationRows = [
  { id: "ST1", feedId: FEED_ID, name: "Colón", latitude: 39.47, longitude: -0.37, transportType: "metro" },
  { id: "ST2", feedId: FEED_ID, name: "Xàtiva", latitude: 39.46, longitude: -0.38, transportType: "metro" },
];

describe("StationRepositoryDrizzle", () => {
  let repo: StationRepositoryDrizzle;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new StationRepositoryDrizzle(db);
    await db.insert(stations).values(stationRows);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("should return station when found by id", async () => {
    const result = await repo.findById(new StationId("ST1"));

    expect(result).not.toBeNull();
    expect(result!.id.value).toBe("ST1");
    expect(result!.name.value).toBe("Colón");
  });

  it("should return null when station id does not exist", async () => {
    const result = await repo.findById(new StationId("NONE"));

    expect(result).toBeNull();
  });

  it("should return station when found by exact name", async () => {
    const result = await repo.findByName("Xàtiva");

    expect(result).not.toBeNull();
    expect(result!.id.value).toBe("ST2");
  });

  it("should return null when name does not match any station", async () => {
    const result = await repo.findByName("Alameda");

    expect(result).toBeNull();
  });

  it("should return matching stations for case-insensitive partial name search", async () => {
    const result = await repo.searchByName("col");

    expect(result.length).toBe(1);
    expect(result[0]!.id.value).toBe("ST1");
  });

  it("should return empty array when no station name matches search query", async () => {
    const result = await repo.searchByName("Alameda");

    expect(result).toEqual([]);
  });

  it("should return all stations", async () => {
    const result = await repo.findAll();

    expect(result.length).toBe(2);
    const ids = result.map((s) => s.id.value).sort();
    expect(ids).toEqual(["ST1", "ST2"]);
  });
});
