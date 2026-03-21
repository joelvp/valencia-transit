import { describe, it, expect, mock } from "bun:test";
import { ListStationsWithLines } from "./ListStationsWithLines.ts";
import type { StationRepository } from "../../domain/station/StationRepository.ts";
import type { LineRepository } from "../../domain/line/LineRepository.ts";
import { Station } from "../../domain/station/Station.ts";
import { StationId } from "../../domain/station/StationId.ts";
import { StationName } from "../../domain/station/StationName.ts";
import { StationLocation } from "../../domain/station/StationLocation.ts";
import { Line } from "../../domain/line/Line.ts";
import { LineId } from "../../domain/line/LineId.ts";
import { LineName } from "../../domain/line/LineName.ts";
import { LineStop } from "../../domain/line/LineStop.ts";

function makeStation(id: string, name = "Station"): Station {
  return new Station(new StationId(id), new StationName(name), new StationLocation(39.47, -0.37));
}

function makeLine(id: string, stationIds: string[]): Line {
  const stops = stationIds.map((sid, i) => new LineStop(new StationId(sid), i + 1));
  return new Line(new LineId(id), new LineName(`Line ${id}`), stops);
}

function makeStationRepo(stations: Station[]): StationRepository {
  return {
    findAll: mock(() => Promise.resolve(stations)),
    findById: mock(() => Promise.resolve(null)),
    findByName: mock(() => Promise.resolve(null)),
    searchByName: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
    saveAll: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
}

function makeLineRepo(lines: Line[]): LineRepository {
  return {
    findAll: mock(() => Promise.resolve(lines)),
    findById: mock(() => Promise.resolve(null)),
    findByStations: mock(() => Promise.resolve([])),
    findByStationId: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
    saveAll: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
}

describe("ListStationsWithLines", () => {
  it("should return stations with their associated lines", async () => {
    const s1 = makeStation("S1", "Xàtiva");
    const s2 = makeStation("S2", "Colón");
    const line = makeLine("L1", ["S1", "S2"]);

    const useCase = new ListStationsWithLines(makeStationRepo([s1, s2]), makeLineRepo([line]));

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    const xativa = result.find((r) => r.station.name.value === "Xàtiva")!;
    const colon = result.find((r) => r.station.name.value === "Colón")!;
    expect(xativa.lines).toHaveLength(1);
    expect(xativa.lines[0]!.id.value).toBe("L1");
    expect(colon.lines).toHaveLength(1);
    // result is sorted alphabetically: Colón before Xàtiva
    expect(result[0]!.station.name.value).toBe("Colón");
    expect(result[1]!.station.name.value).toBe("Xàtiva");
  });

  it("should return empty lines array for a station not on any line", async () => {
    const s1 = makeStation("S1", "Xàtiva");
    const s2 = makeStation("S2", "Colón");
    const line = makeLine("L1", ["S1"]);

    const useCase = new ListStationsWithLines(makeStationRepo([s1, s2]), makeLineRepo([line]));

    const result = await useCase.execute();

    const s2Result = result.find((r) => r.station.id.value === "S2")!;
    expect(s2Result.lines).toHaveLength(0);
  });

  it("should return all lines for a station that appears on multiple lines", async () => {
    const s1 = makeStation("S1", "Xàtiva");
    const lineA = makeLine("LA", ["S1"]);
    const lineB = makeLine("LB", ["S1"]);

    const useCase = new ListStationsWithLines(makeStationRepo([s1]), makeLineRepo([lineA, lineB]));

    const result = await useCase.execute();

    expect(result[0]!.lines).toHaveLength(2);
    const lineIds = result[0]!.lines.map((l) => l.id.value);
    expect(lineIds).toContain("LA");
    expect(lineIds).toContain("LB");
  });

  it("should not duplicate a line for a station that appears multiple times on it", async () => {
    const s1 = makeStation("S1", "Xàtiva");
    // Line visits S1 twice (unusual but defensive check)
    const stops = [
      new LineStop(new StationId("S1"), 1),
      new LineStop(new StationId("S2"), 2),
      new LineStop(new StationId("S1"), 3),
    ];
    const line = new Line(new LineId("L1"), new LineName("Line 1"), stops);

    const useCase = new ListStationsWithLines(makeStationRepo([s1]), makeLineRepo([line]));

    const result = await useCase.execute();

    expect(result[0]!.lines).toHaveLength(1);
  });

  it("should return empty array when there are no stations", async () => {
    const useCase = new ListStationsWithLines(makeStationRepo([]), makeLineRepo([]));
    const result = await useCase.execute();
    expect(result).toHaveLength(0);
  });

  it("should deduplicate lines by name when multiple route variants share the same short name", async () => {
    // Simulates GTFS: route_id "L1-A" and "L1-B" both resolve to LineName("1")
    const s1 = makeStation("S1", "Xàtiva");
    const stops = [new LineStop(new StationId("S1"), 1)];
    const variantA = new Line(new LineId("L1-A"), new LineName("1"), stops);
    const variantB = new Line(new LineId("L1-B"), new LineName("1"), stops);

    const useCase = new ListStationsWithLines(makeStationRepo([s1]), makeLineRepo([variantA, variantB]));
    const result = await useCase.execute();

    expect(result[0]!.lines).toHaveLength(1);
    expect(result[0]!.lines[0]!.name.value).toBe("1");
  });

  it("should deduplicate stations with the same name across multiple stop_ids", async () => {
    // Simulates GTFS: same physical station with multiple stop_ids (e.g. per direction)
    const s1a = makeStation("S1-A", "Xàtiva");
    const s1b = makeStation("S1-B", "Xàtiva");
    const line = makeLine("L1", ["S1-A", "S1-B"]);

    const useCase = new ListStationsWithLines(makeStationRepo([s1a, s1b]), makeLineRepo([line]));
    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0]!.station.name.value).toBe("Xàtiva");
    expect(result[0]!.lines).toHaveLength(1);
  });
});
