import { describe, it, expect, mock } from "bun:test";
import { GetLineStations } from "./GetLineStations";
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

describe("GetLineStations", () => {
  it("should return the line with stations in sequence order", async () => {
    const s1 = makeStation("S1", "Llíria");
    const s2 = makeStation("S2", "Bétera");
    const s3 = makeStation("S3", "Empalme");

    // Stops intentionally out of order to verify sorting
    const stops = [
      new LineStop(new StationId("S3"), 3),
      new LineStop(new StationId("S1"), 1),
      new LineStop(new StationId("S2"), 2),
    ];
    const line = new Line(new LineId("1"), new LineName("Line 1"), stops);

    const useCase = new GetLineStations(makeLineRepo([line]), makeStationRepo([s1, s2, s3]));

    const result = await useCase.execute("1");

    expect(result).not.toBeNull();
    expect(result!.line.id.value).toBe("1");
    expect(result!.stations).toHaveLength(3);
    expect(result!.stations[0]!.name).toBe("Llíria");
    expect(result!.stations[0]!.sequence).toBe(1);
    expect(result!.stations[1]!.name).toBe("Bétera");
    expect(result!.stations[1]!.sequence).toBe(2);
    expect(result!.stations[2]!.name).toBe("Empalme");
    expect(result!.stations[2]!.sequence).toBe(3);
  });

  it("should return null when line is not found", async () => {
    const useCase = new GetLineStations(makeLineRepo([]), makeStationRepo([]));
    const result = await useCase.execute("99");
    expect(result).toBeNull();
  });
});
