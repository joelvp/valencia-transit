import { describe, it, expect, mock } from "bun:test";
import { FindStation } from "./FindStation.ts";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import { StationId } from "@/core/domain/station/StationId";
import { StationName } from "@/core/domain/station/StationName";

function makeStationStub(id: string, name: string) {
  return {
    id: new StationId(id),
    name: new StationName(name),
  } as never;
}

function makeRepo(stations: ReturnType<typeof makeStationStub>[]): StationRepository {
  return {
    searchByName: mock(() => Promise.resolve(stations)),
  } as unknown as StationRepository;
}

describe("FindStation", () => {
  it("should return not_found when no stations match", async () => {
    const useCase = new FindStation(makeRepo([]));

    const result = await useCase.execute("Unknown");

    expect(result).toEqual({ type: "not_found" });
  });

  it("should return unique when exactly one station matches", async () => {
    const useCase = new FindStation(makeRepo([makeStationStub("S1", "Xàtiva")]));

    const result = await useCase.execute("Xàtiva");

    expect(result).toEqual({ type: "unique", stationName: "Xàtiva" });
  });

  it("should return disambiguation when multiple stations match", async () => {
    const useCase = new FindStation(
      makeRepo([makeStationStub("S1", "Colón"), makeStationStub("S2", "Colón (L5)")]),
    );

    const result = await useCase.execute("Colón");

    expect(result).toEqual({
      type: "disambiguation",
      candidates: [{ name: "Colón" }, { name: "Colón (L5)" }],
    });
  });
});
