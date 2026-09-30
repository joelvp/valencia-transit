import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { createContainer, type Container } from "@/adapters/container";
import { clearDatabase, clearTables } from "tests/helpers/db";
import { FgvStationIdRepositoryDrizzle } from "./FgvStationIdRepositoryDrizzle";
import { StationId } from "@/core/domain/station/StationId";
import { stations } from "@/adapters/out/persistence/drizzle/schema";
import { StationMother } from "@/adapters/out/persistence/drizzle/repositories/mothers/StationMother";

const FEED_ID = "metrovalencia";

describe("FgvStationIdRepositoryDrizzle", () => {
  let container: Container;
  let repo: FgvStationIdRepositoryDrizzle;

  beforeAll(() => {
    container = createContainer();
  });

  beforeEach(async () => {
    await clearTables(container.db, "fgv_station_ids", "stations");
    repo = new FgvStationIdRepositoryDrizzle(container.db);
    await container.db.insert(stations).values([
      StationMother.row({ id: "ST1", name: "Colón" }),
      StationMother.row({ id: "ST2", name: "Xàtiva", longitude: -0.38 }),
    ]);
  });

  afterAll(async () => {
    await clearDatabase(container.db);
    await container.dispose();
  });

  it("should return null when no mapping exists for the station", async () => {
    const result = await repo.findFgvStationId(new StationId("ST1"), FEED_ID);
    expect(result).toBeNull();
  });

  it("should save mappings and retrieve the fgv station id by station id", async () => {
    await repo.saveAll(
      [
        { stationId: new StationId("ST1"), fgvStationId: 51 },
        { stationId: new StationId("ST2"), fgvStationId: 43 },
      ],
      FEED_ID,
    );

    const result = await repo.findFgvStationId(new StationId("ST1"), FEED_ID);
    expect(result).toBe(51);
  });

  it("should return all mappings for a feedId", async () => {
    await repo.saveAll(
      [
        { stationId: new StationId("ST1"), fgvStationId: 51 },
        { stationId: new StationId("ST2"), fgvStationId: 43 },
      ],
      FEED_ID,
    );

    const result = await repo.findAll(FEED_ID);
    expect(result.length).toBe(2);
    const ids = result.map((m) => m.stationId.value).sort();
    expect(ids).toEqual(["ST1", "ST2"]);
  });

  it("should replace existing mappings on saveAll (truncate + re-insert)", async () => {
    await repo.saveAll([{ stationId: new StationId("ST1"), fgvStationId: 51 }], FEED_ID);
    await repo.saveAll([{ stationId: new StationId("ST2"), fgvStationId: 43 }], FEED_ID);

    const result = await repo.findAll(FEED_ID);
    expect(result.length).toBe(1);
    expect(result[0]!.stationId.value).toBe("ST2");
  });

  it("should handle empty array without error", async () => {
    await repo.saveAll([], FEED_ID);
    const result = await repo.findAll(FEED_ID);
    expect(result).toEqual([]);
  });

  it("should remove all mappings for the given feedId", async () => {
    await repo.saveAll([{ stationId: new StationId("ST1"), fgvStationId: 51 }], FEED_ID);

    await repo.deleteByFeedId(FEED_ID);

    const result = await repo.findAll(FEED_ID);
    expect(result).toEqual([]);
  });
});
