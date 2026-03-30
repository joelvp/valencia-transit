import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { createContainer, type Container } from "@/adapters/container";
import { clearTables } from "tests/helpers/db";
import { AnalyticsEventRepositoryDrizzle } from "./AnalyticsEventRepositoryDrizzle";
import { DepartureSearched } from "@/core/domain/event/DepartureSearched";
import { LinesBrowsed } from "@/core/domain/event/LinesBrowsed";
import { AnalyticsEventType } from "@/core/domain/event/AnalyticsEventType";

describe("AnalyticsEventRepositoryDrizzle", () => {
  let container: Container;
  let repo: AnalyticsEventRepositoryDrizzle;

  beforeAll(() => {
    container = createContainer();
  });

  beforeEach(async () => {
    await clearTables(container.db, "analytics_events");
    repo = new AnalyticsEventRepositoryDrizzle(container.db);
  });

  afterAll(async () => {
    await clearTables(container.db, "analytics_events");
    await container.dispose();
  });

  it("should return empty array when no events have been saved", async () => {
    const result = await repo.findAll();

    expect(result).toEqual([]);
  });

  it("should save an event and retrieve it via findAll", async () => {
    const event = new DepartureSearched("station-1", "station-2", 3);

    await repo.save(event);
    const result = await repo.findAll();

    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe(AnalyticsEventType.DEPARTURE_SEARCHED);
    expect(result[0]!.aggregateId).toBe("station-1-station-2");
    expect(result[0]!.id).toBeNumber();
  });

  it("should return only events matching the requested type via findByType", async () => {
    const searchEvent = new DepartureSearched("station-1", "station-2", 3);
    const browseEvent = new LinesBrowsed();

    await repo.save(searchEvent);
    await repo.save(searchEvent);
    await repo.save(browseEvent);

    const results = await repo.findByType(AnalyticsEventType.DEPARTURE_SEARCHED);

    expect(results).toHaveLength(2);
    expect(results.every((e) => e.type === AnalyticsEventType.DEPARTURE_SEARCHED)).toBe(true);
  });

  it("should return empty array when no events match the requested type", async () => {
    const results = await repo.findByType(AnalyticsEventType.HELP_REQUESTED);

    expect(results).toEqual([]);
  });

  it("should return only events matching the requested aggregateId via findByAggregateId", async () => {
    const targetEvent = new DepartureSearched("station-1", "station-2", 3);
    const otherEvent = new DepartureSearched("station-3", "station-4", 1);

    await repo.save(targetEvent);
    await repo.save(otherEvent);

    const results = await repo.findByAggregateId("station-1-station-2");

    expect(results).toHaveLength(1);
    expect(results[0]!.aggregateId).toBe("station-1-station-2");
  });

  it("should return empty array when no events match the requested aggregateId", async () => {
    const results = await repo.findByAggregateId("nonexistent");

    expect(results).toEqual([]);
  });
});
