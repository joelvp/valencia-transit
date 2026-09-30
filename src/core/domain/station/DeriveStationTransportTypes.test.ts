import { describe, it, expect } from "bun:test";
import { DeriveStationTransportTypes } from "./DeriveStationTransportTypes";
import { StationId } from "./StationId";
import { Line } from "@/core/domain/line/Line";
import { LineId } from "@/core/domain/line/LineId";
import { LineName } from "@/core/domain/line/LineName";
import { LineStop } from "@/core/domain/line/LineStop";
import { TransportType } from "@/core/domain/shared/TransportType";

function makeLine(id: string, type: TransportType, stationIds: string[]): Line {
  const stops = stationIds.map((s, i) => new LineStop(new StationId(s), i + 1));
  return new Line(new LineId(id), new LineName(`Línia ${id}`), stops, null, type);
}

describe("DeriveStationTransportTypes", () => {
  it("should collect both types for a station on lines of different types", () => {
    const result = DeriveStationTransportTypes.fromLines([
      makeLine("1", TransportType.METRO, ["A", "B"]),
      makeLine("4", TransportType.TRAM, ["B", "C"]),
    ]);

    expect(result.get("A")).toEqual([TransportType.METRO]);
    expect(result.get("B")).toEqual([TransportType.METRO, TransportType.TRAM]);
    expect(result.get("C")).toEqual([TransportType.TRAM]);
  });

  it("should keep one entry for a station on lines of the same type", () => {
    const result = DeriveStationTransportTypes.fromLines([
      makeLine("1", TransportType.METRO, ["A", "B"]),
      makeLine("2", TransportType.METRO, ["B", "C"]),
    ]);

    expect(result.get("B")).toEqual([TransportType.METRO]);
  });

  it("should return an empty map for no lines", () => {
    expect(DeriveStationTransportTypes.fromLines([]).size).toBe(0);
  });
});
