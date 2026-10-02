import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { createContainer, type Container } from "@/adapters/container";
import { clearDatabase, clearTables } from "tests/helpers/db";
import { StationMother } from "@/adapters/out/persistence/drizzle/repositories/mothers/StationMother";

const FEED_ID = "metrovalencia";

describe("TransactionManagerDrizzle", () => {
  let container: Container;

  beforeAll(() => {
    container = createContainer();
  });

  beforeEach(async () => {
    await clearTables(container.db, "stations");
    await container.stationRepository.saveAll([StationMother.create({ id: "OLD" })], FEED_ID);
  });

  afterAll(async () => {
    await clearDatabase(container.db);
    await container.dispose();
  });

  it("should commit repository writes made inside run", async () => {
    await container.transactionManager.run(async () => {
      await container.stationRepository.deleteByFeedId(FEED_ID);
      await container.stationRepository.saveAll([StationMother.create({ id: "NEW" })], FEED_ID);
    });

    const ids = (await container.stationRepository.findAll()).map((s) => s.id.value);
    expect(ids).toEqual(["NEW"]);
  });

  it("should roll back repository writes when the work throws", async () => {
    const run = container.transactionManager.run(async () => {
      await container.stationRepository.deleteByFeedId(FEED_ID);
      await container.stationRepository.saveAll([StationMother.create({ id: "NEW" })], FEED_ID);
      throw new Error("import failed mid-way");
    });

    await expect(run).rejects.toThrow("import failed mid-way");
    const ids = (await container.stationRepository.findAll()).map((s) => s.id.value);
    expect(ids).toEqual(["OLD"]);
  });

  it("should join the outer transaction when run is nested", async () => {
    const run = container.transactionManager.run(async () => {
      await container.transactionManager.run(() =>
        container.stationRepository.deleteByFeedId(FEED_ID),
      );
      throw new Error("outer failed");
    });

    await expect(run).rejects.toThrow("outer failed");
    const ids = (await container.stationRepository.findAll()).map((s) => s.id.value);
    expect(ids).toEqual(["OLD"]);
  });
});
