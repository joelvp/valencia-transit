import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { StationRepositoryDrizzle } from "./StationRepositoryDrizzle";
import { StationId } from "@/core/domain/station/StationId";
import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";
import { stations } from "../schema";
import { createTestSetup } from "./test-db-helper";
import { StationMother } from "./mothers/StationMother";

const FEED_ID = "metrovalencia";
const { db, cleanDatabase, closeDatabase } = createTestSetup();

describe("StationRepositoryDrizzle", () => {
  let repo: StationRepositoryDrizzle;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new StationRepositoryDrizzle(db);
    await db.insert(stations).values([
      StationMother.row(),
      StationMother.row({ id: "ST2", name: "Xàtiva", longitude: -0.38 }),
    ]);
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

  it("should insert station and allow retrieval after save", async () => {
    const station = Station.create("ST3", "Alameda", new StationLocation(39.48, -0.36));

    await repo.save(station, FEED_ID);

    const result = await repo.findById(new StationId("ST3"));
    expect(result).not.toBeNull();
    expect(result!.id.value).toBe("ST3");
    expect(result!.name.value).toBe("Alameda");
  });

  it("should upsert without error when saving an already-existing station", async () => {
    const station = Station.create("ST1", "Colón Updated", new StationLocation(39.47, -0.37));

    await repo.save(station, FEED_ID);

    const result = await repo.findById(new StationId("ST1"));
    expect(result).not.toBeNull();
    expect(result!.name.value).toBe("Colón Updated");
  });

  it("should remove all stations for the given feedId", async () => {
    await repo.deleteByFeedId(FEED_ID);

    const result = await repo.findAll();
    expect(result).toEqual([]);
  });

  it("should not remove stations belonging to a different feedId", async () => {
    const OTHER_FEED = "other-feed";
    await db.insert(stations).values([
      StationMother.row({ id: "ST9", feedId: OTHER_FEED, name: "Patraix", longitude: -0.39 }),
    ]);

    await repo.deleteByFeedId(FEED_ID);

    const rows = await db.select().from(stations);
    expect(rows.length).toBe(1);
    expect(rows[0]!.feedId).toBe(OTHER_FEED);
  });
});
