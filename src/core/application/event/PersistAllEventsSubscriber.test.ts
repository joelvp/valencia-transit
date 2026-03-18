import { describe, it, expect, mock } from "bun:test";
import { PersistAllEventsSubscriber } from "./PersistAllEventsSubscriber";
import { DatasetImported } from "@/core/domain/event/DatasetImported";
import type { DomainEventRepository } from "@/core/domain/event/DomainEventRepository";

function makeMockRepository(): DomainEventRepository {
  return {
    save: mock(() => Promise.resolve()),
    findAll: mock(() => Promise.resolve([])),
    findByType: mock(() => Promise.resolve([])),
    findByAggregateId: mock(() => Promise.resolve([])),
  };
}

describe("PersistAllEventsSubscriber", () => {
  it("should call repository.save exactly once with the received event", async () => {
    const repository = makeMockRepository();
    const subscriber = new PersistAllEventsSubscriber(repository);
    const event = new DatasetImported("metrovalencia", 10, 3, 5, 120);

    await subscriber.handle(event);

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(event);
  });

  it("should work for any DomainEvent subclass", async () => {
    const repository = makeMockRepository();
    const subscriber = new PersistAllEventsSubscriber(repository);
    const event = new DatasetImported("feed-xyz", 0, 0, 0, 0);

    await subscriber.handle(event);

    expect(repository.save).toHaveBeenCalledWith(event);
  });
});
