import { describe, it, expect, mock } from "bun:test";
import { PersistAnalyticsEventsSubscriber } from "./PersistAnalyticsEventsSubscriber";
import { DepartureSearched } from "@/core/domain/event/DepartureSearched";
import { DatasetImported } from "@/core/domain/event/DatasetImported";
import type { AnalyticsEventRepository } from "@/core/domain/event/AnalyticsEventRepository";

function makeMockRepository(): AnalyticsEventRepository {
  return {
    save: mock(() => Promise.resolve()),
    findAll: mock(() => Promise.resolve([])),
    findByType: mock(() => Promise.resolve([])),
    findByAggregateId: mock(() => Promise.resolve([])),
  };
}

describe("PersistAnalyticsEventsSubscriber", () => {
  it("should call repository.save exactly once with the received AnalyticsEvent", async () => {
    const repository = makeMockRepository();
    const subscriber = new PersistAnalyticsEventsSubscriber(repository);
    const event = new DepartureSearched("station-1", "station-2", 3);

    await subscriber.handle(event);

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(event);
  });

  it("should forward traceId from event.traceId to repository.save", async () => {
    const repository = makeMockRepository();
    const subscriber = new PersistAnalyticsEventsSubscriber(repository);
    const event = new DepartureSearched("station-1", "station-2", 3);
    event.traceId = "trace-xyz";

    await subscriber.handle(event);

    expect(repository.save).toHaveBeenCalledWith(event);
  });

  it("should not call repository.save for DomainEvent", async () => {
    const repository = makeMockRepository();
    const subscriber = new PersistAnalyticsEventsSubscriber(repository);
    const event = new DatasetImported("metrovalencia", 10, 3, 5, 120);

    await subscriber.handle(event);

    expect(repository.save).not.toHaveBeenCalled();
  });
});
