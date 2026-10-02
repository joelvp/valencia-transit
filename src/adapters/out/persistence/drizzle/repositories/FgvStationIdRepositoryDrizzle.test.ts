import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { createContainer, type Container } from "@/adapters/container";
import { clearDatabase, clearTables } from "tests/helpers/db";
import { FgvStationIdRepositoryDrizzle } from "./FgvStationIdRepositoryDrizzle";
import { StationId } from "@/core/domain/station/StationId";
import { LiveStationLink } from "@/core/domain/shared/LiveStationLink";
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
    repo = new FgvStationIdRepositoryDrizzle(container.db, FEED_ID);
    await container.db.insert(stations).values([
      StationMother.row({ id: "ST1", name: "Colón" }),
      StationMother.row({ id: "ST2", name: "Xàtiva", longitude: -0.38 }),
    ]);
  });

  afterAll(async () => {
    await clearDatabase(container.db);
    await container.dispose();
  });

  it("should return null when no link exists for the station", async () => {
    expect(await repo.findLiveId(new StationId("ST1"))).toBeNull();
  });

  it("should save links and retrieve the live id by station id", async () => {
    await repo.replaceAll([
      new LiveStationLink(new StationId("ST1"), "51"),
      new LiveStationLink(new StationId("ST2"), "43"),
    ]);

    expect(await repo.findLiveId(new StationId("ST1"))).toBe("51");
    expect(await repo.findLiveId(new StationId("ST2"))).toBe("43");
  });

  it("should replace existing links on replaceAll (truncate + re-insert)", async () => {
    await repo.replaceAll([new LiveStationLink(new StationId("ST1"), "51")]);
    await repo.replaceAll([new LiveStationLink(new StationId("ST2"), "43")]);

    expect(await repo.findLiveId(new StationId("ST1"))).toBeNull();
    expect(await repo.findLiveId(new StationId("ST2"))).toBe("43");
  });

  it("should clear all links when given an empty array", async () => {
    await repo.replaceAll([new LiveStationLink(new StationId("ST1"), "51")]);
    await repo.replaceAll([]);

    expect(await repo.findLiveId(new StationId("ST1"))).toBeNull();
  });

  it("should reject a non-integer live id and keep the previous links", async () => {
    await repo.replaceAll([new LiveStationLink(new StationId("ST1"), "51")]);

    await expect(
      repo.replaceAll([new LiveStationLink(new StationId("ST2"), "abc")]),
    ).rejects.toThrow("integer");

    expect(await repo.findLiveId(new StationId("ST1"))).toBe("51");
  });

  it("should only touch links of its own feed", async () => {
    await repo.replaceAll([new LiveStationLink(new StationId("ST1"), "51")]);
    const other = new FgvStationIdRepositoryDrizzle(container.db, "other-feed");

    expect(await other.findLiveId(new StationId("ST1"))).toBeNull();
  });
});
