import { describe, it, expect } from "bun:test";
import { Line } from "./Line.ts";
import { LineId } from "./LineId.ts";
import { LineName } from "./LineName.ts";
import { LineDirection } from "./LineDirection.ts";
import { LineStop } from "./LineStop.ts";
import { StationId } from "../station/StationId.ts";

function createLine(stops: { id: string; seq: number }[]): Line {
  return new Line(
    new LineId("L1"),
    new LineName("Line 1"),
    LineDirection.OUTBOUND,
    stops.map((s) => new LineStop(new StationId(s.id), s.seq)),
  );
}

describe("Line", () => {
  const line = createLine([
    { id: "A", seq: 1 },
    { id: "B", seq: 2 },
    { id: "C", seq: 3 },
    { id: "D", seq: 4 },
  ]);

  describe("connectsInOrder", () => {
    it("should return true when origin comes before destination", () => {
      expect(line.connectsInOrder(new StationId("A"), new StationId("C"))).toBe(true);
    });

    it("should return false when origin comes after destination", () => {
      expect(line.connectsInOrder(new StationId("C"), new StationId("A"))).toBe(false);
    });

    it("should return false when origin equals destination", () => {
      expect(line.connectsInOrder(new StationId("B"), new StationId("B"))).toBe(false);
    });

    it("should return false when origin is not on the line", () => {
      expect(line.connectsInOrder(new StationId("X"), new StationId("C"))).toBe(false);
    });

    it("should return false when destination is not on the line", () => {
      expect(line.connectsInOrder(new StationId("A"), new StationId("X"))).toBe(false);
    });
  });

  describe("getSequence", () => {
    it("should return the sequence number for a station on the line", () => {
      expect(line.getSequence(new StationId("B"))).toBe(2);
    });

    it("should return undefined for a station not on the line", () => {
      expect(line.getSequence(new StationId("X"))).toBeUndefined();
    });
  });

  describe("stopsAfter", () => {
    it("should return all stops after the given station sorted by sequence", () => {
      const after = line.stopsAfter(new StationId("B"));

      expect(after).toHaveLength(2);
      expect(after[0]!.stationId.value).toBe("C");
      expect(after[1]!.stationId.value).toBe("D");
    });

    it("should return empty array for the last station", () => {
      expect(line.stopsAfter(new StationId("D"))).toHaveLength(0);
    });

    it("should return empty array for a station not on the line", () => {
      expect(line.stopsAfter(new StationId("X"))).toHaveLength(0);
    });
  });

  describe("equals", () => {
    it("should be equal to another line with the same id", () => {
      const other = new Line(
        new LineId("L1"),
        new LineName("Different"),
        LineDirection.INBOUND,
        [],
      );
      expect(line.equals(other)).toBe(true);
    });

    it("should not be equal to a line with a different id", () => {
      const other = new Line(
        new LineId("L2"),
        new LineName("Line 1"),
        LineDirection.OUTBOUND,
        line.stops,
      );
      expect(line.equals(other)).toBe(false);
    });
  });
});
