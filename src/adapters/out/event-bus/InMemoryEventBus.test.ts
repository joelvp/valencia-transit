import { describe, it, expect, mock } from "bun:test";
import { InMemoryEventBus } from "./InMemoryEventBus";
import { DatasetImported } from "@/core/domain/event/DatasetImported";
import type { EventSubscriber } from "@/core/domain/event/EventSubscriber";

function makeEvent(): DatasetImported {
  return new DatasetImported("metrovalencia", 10, 3, 5, 120);
}

describe("InMemoryEventBus", () => {
  it("should do nothing when there are no subscribers", async () => {
    const bus = new InMemoryEventBus([]);

    await expect(bus.publish(makeEvent())).resolves.toBeUndefined();
  });

  it("should call handle once on a single subscriber", async () => {
    const handleMock = mock(() => Promise.resolve());
    const subscriber: EventSubscriber = { handle: handleMock };
    const bus = new InMemoryEventBus([subscriber]);
    const event = makeEvent();

    await bus.publish(event);

    expect(handleMock).toHaveBeenCalledTimes(1);
    expect(handleMock).toHaveBeenCalledWith(event, undefined);
  });

  it("should call all subscribers when multiple are registered", async () => {
    const calls: number[] = [];
    const sub1: EventSubscriber = {
      handle: mock(() => {
        calls.push(1);
        return Promise.resolve();
      }),
    };
    const sub2: EventSubscriber = {
      handle: mock(() => {
        calls.push(2);
        return Promise.resolve();
      }),
    };
    const bus = new InMemoryEventBus([sub1, sub2]);

    await bus.publish(makeEvent());

    expect(calls).toEqual([1, 2]);
  });

  it("should forward traceId to subscribers", async () => {
    const handleMock = mock(() => Promise.resolve());
    const subscriber: EventSubscriber = { handle: handleMock };
    const bus = new InMemoryEventBus([subscriber]);
    const event = makeEvent();

    await bus.publish(event, "trace-123");

    expect(handleMock).toHaveBeenCalledWith(event, "trace-123");
  });

  it("should propagate an error thrown by a subscriber", async () => {
    const subscriber: EventSubscriber = {
      handle: mock(() => Promise.reject(new Error("subscriber failed"))),
    };
    const bus = new InMemoryEventBus([subscriber]);

    await expect(bus.publish(makeEvent())).rejects.toThrow("subscriber failed");
  });
});
