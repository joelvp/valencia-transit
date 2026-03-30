import { describe, it, expect, mock } from "bun:test";
import type { EventBus } from "@/core/domain/event/EventBus";
import { ListLines } from "./ListLines";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { LineRepository } from "@/core/domain/line/LineRepository";
import { Station } from "@/core/domain/station/Station";
import { StationId } from "@/core/domain/station/StationId";
import { StationName } from "@/core/domain/station/StationName";
import { StationLocation } from "@/core/domain/station/StationLocation";
import { Line } from "@/core/domain/line/Line";
import { LineId } from "@/core/domain/line/LineId";
import { LineName } from "@/core/domain/line/LineName";
import { LineStop } from "@/core/domain/line/LineStop";
import { TransportType } from "@/core/domain/shared/TransportType";

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

const mockEventBus: EventBus = { publish: mock(() => Promise.resolve()) };

describe("ListLines", () => {
  it("should return lines sorted numerically with correct terminal names", async () => {
    const s1 = makeStation("S1", "Llíria");
    const s2 = makeStation("S2", "Empalme");
    const s3 = makeStation("S3", "Torrent");
    const s4 = makeStation("S4", "Marítim");

    const line1 = makeLine("1", ["S1", "S2"]);
    const line2 = makeLine("2", ["S3", "S4"]);

    const useCase = new ListLines(
      makeLineRepo([line2, line1]),
      makeStationRepo([s1, s2, s3, s4]),
      mockEventBus,
    );

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
      mockEventBus,
    );

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0]!.line.id.value).toBe("1");
  });

  it("should return empty array when there are no lines", async () => {
    const useCase = new ListLines(makeLineRepo([]), makeStationRepo([]), mockEventBus);
    const result = await useCase.execute();
    expect(result).toHaveLength(0);
  });
});
