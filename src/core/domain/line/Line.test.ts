import { describe, it, expect } from "bun:test";
import { Line } from "./Line.ts";
import { LineId } from "./LineId.ts";
import { LineName } from "./LineName.ts";
import { LineStop } from "./LineStop.ts";
import { LineColor } from "./LineColor.ts";
import { StationId } from "../station/StationId.ts";

function createLine(stops: { id: string; seq: number }[]): Line {
  return new Line(
    new LineId("L1"),
    new LineName("Line 1"),
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
      const other = new Line(new LineId("L1"), new LineName("Different"), []);
      expect(line.equals(other)).toBe(true);
    });

    it("should not be equal to a line with a different id", () => {
      const other = new Line(new LineId("L2"), new LineName("Line 1"), line.stops);
      expect(line.equals(other)).toBe(false);
    });
  });

  describe("color", () => {
    it("should default color to null when not provided", () => {
      expect(line.color).toBeNull();
    });

    it("should store the color when provided", () => {
      const color = new LineColor("FFA500");
      const lineWithColor = new Line(new LineId("L1"), new LineName("Line 1"), [], color);
      expect(lineWithColor.color?.value).toBe("FFA500");
    });

    it("equality should be based on id, not color", () => {
      const color = new LineColor("FFA500");
      const withColor = new Line(new LineId("L1"), new LineName("Line 1"), [], color);
      const withoutColor = new Line(new LineId("L1"), new LineName("Line 1"), []);
      expect(withColor.equals(withoutColor)).toBe(true);
    });
  });
});
