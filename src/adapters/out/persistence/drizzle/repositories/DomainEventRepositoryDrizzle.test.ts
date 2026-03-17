import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { createContainer, type Container } from "@/adapters/container";
import { clearTables } from "tests/helpers/db";
import { DomainEventRepositoryDrizzle } from "./DomainEventRepositoryDrizzle";
import { DatasetImported } from "@/core/domain/event/DatasetImported";
import { DomainEventType } from "@/core/domain/event/DomainEventType";

describe("DomainEventRepositoryDrizzle", () => {
  let container: Container;
  let repo: DomainEventRepositoryDrizzle;

  beforeAll(() => {
    container = createContainer();
  });

  beforeEach(async () => {
    await clearTables(container.db, "domain_events");
    repo = new DomainEventRepositoryDrizzle(container.db);
  });

  afterAll(async () => {
    await container.dispose();
  });

  it("should return empty array when no events have been saved", async () => {
    const result = await repo.findAll();

    expect(result).toEqual([]);
  });

  it("should save an event and retrieve it via findAll", async () => {
    const event = new DatasetImported("metrovalencia", 10, 3, 5, 120);

    await repo.save(event);
    const result = await repo.findAll();

    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe(DomainEventType.DATASET_IMPORTED);
    expect(result[0]!.body).toMatchObject({ feedId: "metrovalencia", stationsCount: 10 });
    expect(result[0]!.id).toBeNumber();
  });

  it("should return only events matching the requested type via findByType", async () => {
    const importEvent = new DatasetImported("metrovalencia", 10, 3, 5, 120);
    await repo.save(importEvent);
    await repo.save(importEvent);

    const results = await repo.findByType(DomainEventType.DATASET_IMPORTED);

    expect(results).toHaveLength(2);
    expect(results.every((e) => e.type === DomainEventType.DATASET_IMPORTED)).toBe(true);
  });

  it("should return empty array when no events match the requested type", async () => {
    const results = await repo.findByType(DomainEventType.DEPARTURE_SEARCHED);

    expect(results).toEqual([]);
  });

  it("should return only events matching the requested aggregateId via findByAggregateId", async () => {
    class EventWithAggregate extends DatasetImported {
      override readonly aggregateId = "feed-target";
      override readonly aggregateType = "Dataset";
    }
    class EventOtherAggregate extends DatasetImported {
      override readonly aggregateId = "feed-other";
      override readonly aggregateType = "Dataset";
    }

    await repo.save(new EventWithAggregate("feed-target", 5, 2, 3, 50));
    await repo.save(new EventOtherAggregate("feed-other", 1, 1, 1, 10));

    const results = await repo.findByAggregateId("feed-target");

    expect(results).toHaveLength(1);
    expect(results[0]!.aggregateId).toBe("feed-target");
  });

  it("should return empty array when no events match the requested aggregateId", async () => {
    const results = await repo.findByAggregateId("nonexistent");

    expect(results).toEqual([]);
  });
});
