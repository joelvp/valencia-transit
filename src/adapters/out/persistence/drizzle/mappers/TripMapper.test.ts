import { describe, it, expect } from "bun:test";
import { TripMapper } from "./TripMapper";
import { Trip } from "@/core/domain/trip/Trip";
import { TripId } from "@/core/domain/trip/TripId";
import { PassingTime } from "@/core/domain/trip/PassingTime";
import { LineId } from "@/core/domain/line/LineId";
import { LineDirection } from "@/core/domain/line/LineDirection";
import { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import { StationId } from "@/core/domain/station/StationId";
import { TimeOfDay } from "@/core/domain/shared/TimeOfDay";

describe("TripMapper", () => {
  describe("toDomain", () => {
    it("should convert a DB row with multiple passing times to a Trip domain entity", () => {
      const row = {
        id: "trip-1",
        lineId: "line-1",
        scheduleId: "schedule-1",
        direction: "OUTBOUND",
      };
      const passingTimeRows = [
        { tripId: "trip-1", stationId: "station-1", arrivalTime: "08:00:00", departureTime: "08:01:00", sequence: 1 },
        { tripId: "trip-1", stationId: "station-2", arrivalTime: "08:10:00", departureTime: "08:11:00", sequence: 2 },
        { tripId: "trip-1", stationId: "station-3", arrivalTime: "08:20:00", departureTime: "08:21:00", sequence: 3 },
      ];

      const trip = TripMapper.toDomain(row, passingTimeRows);

      expect(trip.id.value).toBe("trip-1");
      expect(trip.lineId.value).toBe("line-1");
      expect(trip.scheduleId.value).toBe("schedule-1");
      expect(trip.direction).toBe(LineDirection.OUTBOUND);
      expect(trip.passingTimes).toHaveLength(3);
      expect(trip.passingTimes[0]!.stationId.value).toBe("station-1");
      expect(trip.passingTimes[0]!.arrivalTime.value).toBe("08:00:00");
      expect(trip.passingTimes[0]!.departureTime.value).toBe("08:01:00");
      expect(trip.passingTimes[0]!.sequence).toBe(1);
      expect(trip.passingTimes[2]!.stationId.value).toBe("station-3");
      expect(trip.passingTimes[2]!.sequence).toBe(3);
    });

    it("should parse INBOUND direction correctly", () => {
      const row = {
        id: "trip-1",
        lineId: "line-1",
        scheduleId: "schedule-1",
        direction: "INBOUND",
      };
      const passingTimeRows = [
        { tripId: "trip-1", stationId: "station-3", arrivalTime: "09:00:00", departureTime: "09:01:00", sequence: 1 },
        { tripId: "trip-1", stationId: "station-1", arrivalTime: "09:20:00", departureTime: "09:21:00", sequence: 2 },
      ];

      const trip = TripMapper.toDomain(row, passingTimeRows);

      expect(trip.direction).toBe(LineDirection.INBOUND);
    });

    it("should return a Trip instance", () => {
      const row = {
        id: "trip-1",
        lineId: "line-1",
        scheduleId: "schedule-1",
        direction: "OUTBOUND",
      };
      const passingTimeRows = [
        { tripId: "trip-1", stationId: "station-1", arrivalTime: "08:00:00", departureTime: "08:01:00", sequence: 1 },
      ];

      const trip = TripMapper.toDomain(row, passingTimeRows);

      expect(trip).toBeInstanceOf(Trip);
    });

    it("should handle empty passing times array", () => {
      const row = {
        id: "trip-1",
        lineId: "line-1",
        scheduleId: "schedule-1",
        direction: "OUTBOUND",
      };

      const trip = TripMapper.toDomain(row, []);

      expect(trip.passingTimes).toHaveLength(0);
    });

    it("should throw on invalid direction", () => {
      const row = {
        id: "trip-1",
        lineId: "line-1",
        scheduleId: "schedule-1",
        direction: "INVALID",
      };
      const passingTimeRows = [
        { tripId: "trip-1", stationId: "station-1", arrivalTime: "08:00:00", departureTime: "08:01:00", sequence: 1 },
      ];

      expect(() => TripMapper.toDomain(row, passingTimeRows)).toThrow();
    });

    it("should handle GTFS next-day times where hours exceed 23", () => {
      const row = {
        id: "trip-late",
        lineId: "line-1",
        scheduleId: "schedule-1",
        direction: "OUTBOUND",
      };
      const passingTimeRows = [
        { tripId: "trip-late", stationId: "station-1", arrivalTime: "25:00:00", departureTime: "25:01:00", sequence: 1 },
      ];

      const trip = TripMapper.toDomain(row, passingTimeRows);

      expect(trip.passingTimes[0]!.arrivalTime.value).toBe("25:00:00");
      expect(trip.passingTimes[0]!.departureTime.value).toBe("25:01:00");
    });
  });

  describe("toPersistence", () => {
    it("should convert a Trip domain entity to trip and passingTime rows", () => {
      const passingTimes = [
        new PassingTime(
          new StationId("station-1"),
          new TimeOfDay("08:00:00"),
          new TimeOfDay("08:01:00"),
          1,
        ),
        new PassingTime(
          new StationId("station-2"),
          new TimeOfDay("08:10:00"),
          new TimeOfDay("08:11:00"),
          2,
        ),
      ];
      const trip = new Trip(
        new TripId("trip-1"),
        new LineId("line-1"),
        new ScheduleId("schedule-1"),
        LineDirection.OUTBOUND,
        passingTimes,
      );

      const result = TripMapper.toPersistence(trip, "metrovalencia");

      expect(result.trip.id).toBe("trip-1");
      expect(result.trip.feedId).toBe("metrovalencia");
      expect(result.trip.lineId).toBe("line-1");
      expect(result.trip.scheduleId).toBe("schedule-1");
      expect(result.trip.direction).toBe("OUTBOUND");
      expect(result.trip.headsign).toBeNull();

      expect(result.passingTimes).toHaveLength(2);
      expect(result.passingTimes[0]!.tripId).toBe("trip-1");
      expect(result.passingTimes[0]!.stationId).toBe("station-1");
      expect(result.passingTimes[0]!.feedId).toBe("metrovalencia");
      expect(result.passingTimes[0]!.arrivalTime).toBe("08:00:00");
      expect(result.passingTimes[0]!.departureTime).toBe("08:01:00");
      expect(result.passingTimes[0]!.sequence).toBe(1);
      expect(result.passingTimes[1]!.stationId).toBe("station-2");
      expect(result.passingTimes[1]!.sequence).toBe(2);
    });

    it("should always set headsign to null", () => {
      const trip = new Trip(
        new TripId("trip-1"),
        new LineId("line-1"),
        new ScheduleId("schedule-1"),
        LineDirection.INBOUND,
        [],
      );

      const result = TripMapper.toPersistence(trip, "metrovalencia");

      expect(result.trip.headsign).toBeNull();
    });

    it("should produce empty passingTimes array when trip has no passing times", () => {
      const trip = new Trip(
        new TripId("trip-1"),
        new LineId("line-1"),
        new ScheduleId("schedule-1"),
        LineDirection.OUTBOUND,
        [],
      );

      const result = TripMapper.toPersistence(trip, "metrovalencia");

      expect(result.passingTimes).toHaveLength(0);
    });
  });

  describe("round-trip", () => {
    it("should produce an equivalent entity after toPersistence and toDomain", () => {
      const passingTimes = [
        new PassingTime(
          new StationId("station-1"),
          new TimeOfDay("08:00:00"),
          new TimeOfDay("08:01:00"),
          1,
        ),
        new PassingTime(
          new StationId("station-2"),
          new TimeOfDay("08:10:00"),
          new TimeOfDay("08:11:00"),
          2,
        ),
      ];
      const original = new Trip(
        new TripId("trip-1"),
        new LineId("line-1"),
        new ScheduleId("schedule-1"),
        LineDirection.OUTBOUND,
        passingTimes,
      );

      const { trip: tripRow, passingTimes: passingTimeRows } =
        TripMapper.toPersistence(original, "metrovalencia");
      const restored = TripMapper.toDomain(tripRow, passingTimeRows);

      expect(restored.id.value).toBe(original.id.value);
      expect(restored.lineId.value).toBe(original.lineId.value);
      expect(restored.scheduleId.value).toBe(original.scheduleId.value);
      expect(restored.direction).toBe(original.direction);
      expect(restored.passingTimes).toHaveLength(original.passingTimes.length);
      expect(restored.passingTimes[0]!.stationId.value).toBe(original.passingTimes[0]!.stationId.value);
      expect(restored.passingTimes[0]!.arrivalTime.value).toBe(original.passingTimes[0]!.arrivalTime.value);
      expect(restored.passingTimes[0]!.departureTime.value).toBe(original.passingTimes[0]!.departureTime.value);
      expect(restored.passingTimes[1]!.sequence).toBe(original.passingTimes[1]!.sequence);
    });
  });
});
