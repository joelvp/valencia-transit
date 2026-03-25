import { describe, it, expect, mock } from "bun:test";
import { ListLines } from "./ListLines.ts";
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
import { TransportType } from "../../domain/shared/TransportType.ts";

function makeStation(id: string, name: string): Station {
  return new Station(new StationId(id), new StationName(name), new StationLocation(39.47, -0.37), [
    TransportType.METRO,
  ]);
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
    updateTransportTypes: mock(() => Promise.resolve()),
  };
}

function makeLineRepo(lines: Line[]): LineRepository {
  return {
    findAll: mock(() => Promise.resolve(lines)),
    findByStationIds: mock(() => Promise.resolve([])),
    saveMany: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
  };
}

describe("ListLines", () => {
  it("should return lines sorted numerically with correct terminal names", async () => {
    const s1 = makeStation("S1", "Llíria");
    const s2 = makeStation("S2", "Empalme");
    const s3 = makeStation("S3", "Torrent");
    const s4 = makeStation("S4", "Marítim");

    const line1 = makeLine("1", ["S1", "S2"]);
    const line2 = makeLine("2", ["S3", "S4"]);

    const useCase = new ListLines(makeLineRepo([line2, line1]), makeStationRepo([s1, s2, s3, s4]));

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(result[0]!.line.id.value).toBe("1");
    expect(result[0]!.terminalFrom).toBe("Llíria");
    expect(result[0]!.terminalTo).toBe("Empalme");
    expect(result[1]!.line.id.value).toBe("2");
    expect(result[1]!.terminalFrom).toBe("Torrent");
    expect(result[1]!.terminalTo).toBe("Marítim");
  });

  it("should exclude lines with no stops", async () => {
    const s1 = makeStation("S1", "Xàtiva");
    const lineWithStops = makeLine("1", ["S1"]);
    const lineWithoutStops = new Line(new LineId("2"), new LineName("Line 2"), []);

    const useCase = new ListLines(
      makeLineRepo([lineWithStops, lineWithoutStops]),
      makeStationRepo([s1]),
    );

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0]!.line.id.value).toBe("1");
  });

  it("should return empty array when there are no lines", async () => {
    const useCase = new ListLines(makeLineRepo([]), makeStationRepo([]));
    const result = await useCase.execute();
    expect(result).toHaveLength(0);
  });
});
