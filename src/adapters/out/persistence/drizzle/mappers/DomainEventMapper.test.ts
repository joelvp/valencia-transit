import { describe, it, expect } from "bun:test";
import { DomainEventMapper } from "./DomainEventMapper";
import { DomainEventType } from "@/core/domain/event/DomainEventType";
import { StoredDomainEvent } from "@/core/domain/event/StoredDomainEvent";
import { DatasetImported } from "@/core/domain/event/DatasetImported";

describe("DomainEventMapper", () => {
  describe("toDomain", () => {
    it("should convert a DB row with all fields to a StoredDomainEvent", () => {
      const occurredOn = new Date("2026-03-16T10:00:00Z");
      const row = {
        id: 1,
        type: "dataset.imported",
        occurredOn,
        body: { feedId: "metrovalencia", stationsCount: 10 },
        aggregateId: "metrovalencia",
        aggregateType: "Dataset",
        traceId: "trace-abc",
      };

      const result = DomainEventMapper.toDomain(row);

      expect(result).toBeInstanceOf(StoredDomainEvent);
      expect(result.id).toBe(1);
      expect(result.type).toBe(DomainEventType.DATASET_IMPORTED);
      expect(result.occurredOn).toBe(occurredOn);
      expect(result.body).toEqual({ feedId: "metrovalencia", stationsCount: 10 });
      expect(result.aggregateId).toBe("metrovalencia");
      expect(result.aggregateType).toBe("Dataset");
      expect(result.traceId).toBe("trace-abc");
    });

    it("should map null optional fields (aggregateId, aggregateType, traceId) to null", () => {
      const row = {
        id: 2,
        type: "dataset.imported",
        occurredOn: new Date(),
        body: {},
        aggregateId: null,
        aggregateType: null,
        traceId: null,
      };

      const result = DomainEventMapper.toDomain(row);

      expect(result.aggregateId).toBeNull();
      expect(result.aggregateType).toBeNull();
      expect(result.traceId).toBeNull();
    });
  });

  describe("toPersistence", () => {
    it("should convert a DatasetImported event to an insert shape with correct type and body", () => {
      const event = new DatasetImported("metrovalencia", 10, 3, 5, 120);

      const result = DomainEventMapper.toPersistence(event);

      expect(result.type).toBe(DomainEventType.DATASET_IMPORTED);
      expect(result.occurredOn).toBeInstanceOf(Date);
      expect(result.body).toMatchObject({ feedId: "metrovalencia", stationsCount: 10 });
      expect(result.traceId).toBeNull();
    });

    it("should read traceId from event.traceId", () => {
      const event = new DatasetImported("metrovalencia", 10, 3, 5, 120, "trace-xyz");

      const result = DomainEventMapper.toPersistence(event);

      expect(result.traceId).toBe("trace-xyz");
    });

    it("should map aggregateId and aggregateType from DatasetImported feedId", () => {
      const event = new DatasetImported("metrovalencia", 10, 3, 5, 120);

      const result = DomainEventMapper.toPersistence(event);

      expect(result.aggregateId).toBe("metrovalencia");
      expect(result.aggregateType).toBe("feed");
    });
  });
});
