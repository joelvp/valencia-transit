import { describe, it, expect } from "bun:test";
import { LineMapper } from "./LineMapper";
import { Line } from "@/core/domain/line/Line";
import { LineId } from "@/core/domain/line/LineId";
import { LineName } from "@/core/domain/line/LineName";
import { LineDirection } from "@/core/domain/line/LineDirection";
import { LineStop } from "@/core/domain/line/LineStop";
import { StationId } from "@/core/domain/station/StationId";

describe("LineMapper", () => {
  describe("toDomain", () => {
    it("should convert a DB row with multiple stops to a Line domain entity", () => {
      const row = { id: "line-1", name: "Línia 1" };
      const lineStationRows = [
        { stationId: "station-1", sequence: 1, direction: "OUTBOUND" },
        { stationId: "station-2", sequence: 2, direction: "OUTBOUND" },
        { stationId: "station-3", sequence: 3, direction: "OUTBOUND" },
      ];

      const line = LineMapper.toDomain(row, lineStationRows);

      expect(line.id.value).toBe("line-1");
      expect(line.name.value).toBe("Línia 1");
      expect(line.direction).toBe(LineDirection.OUTBOUND);
      expect(line.stops).toHaveLength(3);
      expect(line.stops[0]!.stationId.value).toBe("station-1");
      expect(line.stops[0]!.sequence).toBe(1);
      expect(line.stops[2]!.stationId.value).toBe("station-3");
      expect(line.stops[2]!.sequence).toBe(3);
    });

    it("should parse INBOUND direction correctly", () => {
      const row = { id: "line-1", name: "Línia 1" };
      const lineStationRows = [
        { stationId: "station-3", sequence: 1, direction: "INBOUND" },
        { stationId: "station-2", sequence: 2, direction: "INBOUND" },
      ];

      const line = LineMapper.toDomain(row, lineStationRows);

      expect(line.direction).toBe(LineDirection.INBOUND);
    });

    it("should return a Line instance", () => {
      const row = { id: "line-1", name: "Línia 1" };
      const lineStationRows = [{ stationId: "station-1", sequence: 1, direction: "OUTBOUND" }];

      const line = LineMapper.toDomain(row, lineStationRows);

      expect(line).toBeInstanceOf(Line);
    });

    it("should handle empty stops array", () => {
      const row = { id: "line-1", name: "Línia 1" };

      const line = LineMapper.toDomain(row, []);

      expect(line.stops).toHaveLength(0);
    });

    it("should throw on invalid direction", () => {
      const row = { id: "line-1", name: "Línia 1" };
      const lineStationRows = [{ stationId: "station-1", sequence: 1, direction: "INVALID" }];

      expect(() => LineMapper.toDomain(row, lineStationRows)).toThrow();
    });
  });

  describe("toPersistence", () => {
    it("should convert a Line domain entity to line and lineStation rows", () => {
      const stops = [
        new LineStop(new StationId("station-1"), 1),
        new LineStop(new StationId("station-2"), 2),
      ];
      const line = new Line(
        new LineId("line-1"),
        new LineName("Línia 1"),
        LineDirection.OUTBOUND,
        stops,
      );

      const result = LineMapper.toPersistence(line, "metrovalencia");

      expect(result.line.id).toBe("line-1");
      expect(result.line.feedId).toBe("metrovalencia");
      expect(result.line.name).toBe("Línia 1");
      expect(result.line.shortName).toBeNull();
      expect(result.line.transportType).toBe("metro");

      expect(result.lineStations).toHaveLength(2);
      expect(result.lineStations[0]!.lineId).toBe("line-1");
      expect(result.lineStations[0]!.stationId).toBe("station-1");
      expect(result.lineStations[0]!.feedId).toBe("metrovalencia");
      expect(result.lineStations[0]!.sequence).toBe(1);
      expect(result.lineStations[0]!.direction).toBe("OUTBOUND");
      expect(result.lineStations[1]!.stationId).toBe("station-2");
      expect(result.lineStations[1]!.sequence).toBe(2);
    });
  });

  describe("round-trip", () => {
    it("should produce an equivalent entity after toPersistence and toDomain", () => {
      const stops = [
        new LineStop(new StationId("station-1"), 1),
        new LineStop(new StationId("station-2"), 2),
      ];
      const original = new Line(
        new LineId("line-1"),
        new LineName("Línia 1"),
        LineDirection.OUTBOUND,
        stops,
      );

      const { line: lineRow, lineStations } = LineMapper.toPersistence(original, "metrovalencia");
      const restored = LineMapper.toDomain(lineRow, lineStations);

      expect(restored.id.value).toBe(original.id.value);
      expect(restored.name.value).toBe(original.name.value);
      expect(restored.direction).toBe(original.direction);
      expect(restored.stops).toHaveLength(original.stops.length);
      expect(restored.stops[0]!.stationId.value).toBe(original.stops[0]!.stationId.value);
      expect(restored.stops[1]!.sequence).toBe(original.stops[1]!.sequence);
    });
  });
});
