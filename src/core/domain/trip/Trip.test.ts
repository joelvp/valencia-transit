import { describe, it, expect } from "bun:test";
import { Trip } from "./Trip.ts";
import { TripId } from "./TripId.ts";
import { LineId } from "../line/LineId.ts";
import { ScheduleId } from "../schedule/ScheduleId.ts";
import { LineDirection } from "../line/LineDirection.ts";
import { PassingTime } from "./PassingTime.ts";
import { StationId } from "../station/StationId.ts";
import { TimeOfDay } from "../shared/TimeOfDay.ts";

function createTrip(
  passingTimes?: { stationId: string; arrival: string; departure: string; seq: number }[],
): Trip {
  const times = (
    passingTimes ?? [
      { stationId: "A", arrival: "08:00:00", departure: "08:01:00", seq: 1 },
      { stationId: "B", arrival: "08:05:00", departure: "08:06:00", seq: 2 },
      { stationId: "C", arrival: "08:10:00", departure: "08:11:00", seq: 3 },
    ]
  ).map(
    (pt) =>
      new PassingTime(
        new StationId(pt.stationId),
        new TimeOfDay(pt.arrival),
        new TimeOfDay(pt.departure),
        pt.seq,
      ),
  );

  return new Trip(
    new TripId("T1"),
    new LineId("L1"),
    new ScheduleId("SCH1"),
    LineDirection.OUTBOUND,
    times,
  );
}

describe("Trip", () => {
  const trip = createTrip();

  describe("getDepartureTimeAt", () => {
    it("should return the departure time at a station the trip passes through", () => {
      const time = trip.getDepartureTimeAt(new StationId("B"));

      expect(time).toBeDefined();
      expect(time!.value).toBe("08:06:00");
    });

    it("should return undefined for a station the trip does not pass through", () => {
      expect(trip.getDepartureTimeAt(new StationId("X"))).toBeUndefined();
    });
  });

  describe("passesThrough", () => {
    it("should return true for a station on the trip", () => {
      expect(trip.passesThrough(new StationId("B"))).toBe(true);
    });

    it("should return false for a station not on the trip", () => {
      expect(trip.passesThrough(new StationId("X"))).toBe(false);
    });
  });

  describe("stopsInOrder", () => {
    it("should return true when origin comes before destination", () => {
      expect(trip.stopsInOrder(new StationId("A"), new StationId("C"))).toBe(true);
    });

    it("should return false when origin comes after destination", () => {
      expect(trip.stopsInOrder(new StationId("C"), new StationId("A"))).toBe(false);
    });

    it("should return false when origin equals destination", () => {
      expect(trip.stopsInOrder(new StationId("A"), new StationId("A"))).toBe(false);
    });

    it("should return false when origin is not on the trip", () => {
      expect(trip.stopsInOrder(new StationId("X"), new StationId("C"))).toBe(false);
    });

    it("should return false when destination is not on the trip", () => {
      expect(trip.stopsInOrder(new StationId("A"), new StationId("X"))).toBe(false);
    });
  });

  describe("equals", () => {
    it("should be equal to another trip with the same id", () => {
      const other = new Trip(
        new TripId("T1"),
        new LineId("L2"),
        new ScheduleId("SCH2"),
        LineDirection.INBOUND,
        [],
      );
      expect(trip.equals(other)).toBe(true);
    });

    it("should not be equal to a trip with a different id", () => {
      const other = createTrip();
      const different = new Trip(
        new TripId("T2"),
        other.lineId,
        other.scheduleId,
        other.direction,
        other.passingTimes,
      );
      expect(trip.equals(different)).toBe(false);
    });
  });
});
