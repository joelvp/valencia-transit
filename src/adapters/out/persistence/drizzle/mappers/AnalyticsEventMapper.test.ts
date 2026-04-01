import { describe, it, expect } from "bun:test";
import { AnalyticsEventMapper } from "./AnalyticsEventMapper";
import { AnalyticsEventType } from "@/core/domain/event/AnalyticsEventType";
import { StoredAnalyticsEvent } from "@/core/domain/event/StoredAnalyticsEvent";
import { DepartureSearched } from "@/core/domain/event/DepartureSearched";
import { LinesBrowsed } from "@/core/domain/event/LinesBrowsed";

const validUserId = "550e8400-e29b-41d4-a716-446655440000";

describe("AnalyticsEventMapper", () => {
  describe("toPersistence", () => {
    it("should convert a DepartureSearched event to an insert shape with correct type and body", () => {
      const event = new DepartureSearched("station-1", "station-2", 5);

      const result = AnalyticsEventMapper.toPersistence(event);

      expect(result.type).toBe(AnalyticsEventType.DEPARTURE_SEARCHED);
      expect(result.occurredOn).toBeInstanceOf(Date);
      expect(result.body).toMatchObject({
        originStationId: "station-1",
        destinationStationId: "station-2",
        resultsCount: 5,
      });
      expect(result.aggregateId).toBeNull();
      expect(result.aggregateType).toBeNull();
    });

    it("should set aggregateId to userId when provided", () => {
      const event = new DepartureSearched("station-1", "station-2", 5, validUserId);

      const result = AnalyticsEventMapper.toPersistence(event);

      expect(result.aggregateId).toBe(validUserId);
      expect(result.aggregateType).toBeNull();
    });

    it("should convert a LinesBrowsed event with null optional fields", () => {
      const event = new LinesBrowsed();

      const result = AnalyticsEventMapper.toPersistence(event);

      expect(result.type).toBe(AnalyticsEventType.LINES_BROWSED);
      expect(result.occurredOn).toBeInstanceOf(Date);
      expect(result.aggregateId).toBeNull();
      expect(result.aggregateType).toBeNull();
      expect(result.traceId).toBeNull();
    });

    it("should read traceId from event.traceId when set", () => {
      const event = new DepartureSearched("station-1", "station-2", 3);
      event.traceId = "trace-xyz";

      const result = AnalyticsEventMapper.toPersistence(event);

      expect(result.traceId).toBe("trace-xyz");
    });

    it("should set traceId to null when event.traceId is not set", () => {
      const event = new DepartureSearched("station-1", "station-2", 3);

      const result = AnalyticsEventMapper.toPersistence(event);

      expect(result.traceId).toBeNull();
    });
  });

  describe("toDomain", () => {
    it("should convert a DB row to a StoredAnalyticsEvent", () => {
      const occurredOn = new Date("2026-03-29T10:00:00Z");
      const row = {
        id: 1,
        type: "departure.searched",
        occurredOn,
        body: { originStationId: "station-1", destinationStationId: "station-2", resultsCount: 5 },
        aggregateId: validUserId,
        aggregateType: null,
        traceId: "trace-abc",
      };

      const result = AnalyticsEventMapper.toDomain(row);

      expect(result).toBeInstanceOf(StoredAnalyticsEvent);
      expect(result.id).toBe(1);
      expect(result.type).toBe(AnalyticsEventType.DEPARTURE_SEARCHED);
      expect(result.occurredOn).toBe(occurredOn);
      expect(result.body).toEqual({
        originStationId: "station-1",
        destinationStationId: "station-2",
        resultsCount: 5,
      });
      expect(result.userId).toBe(validUserId);
      expect(result.traceId).toBe("trace-abc");
    });

    it("should map null optional fields to null", () => {
      const row = {
        id: 2,
        type: "lines.browsed",
        occurredOn: new Date(),
        body: {},
        aggregateId: null,
        aggregateType: null,
        traceId: null,
      };

      const result = AnalyticsEventMapper.toDomain(row);

      expect(result.type).toBe(AnalyticsEventType.LINES_BROWSED);
      expect(result.userId).toBeNull();
      expect(result.traceId).toBeNull();
    });
  });
});
