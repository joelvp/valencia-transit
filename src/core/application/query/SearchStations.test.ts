import { describe, it, expect, mock } from "bun:test";
import { SearchStations } from "./SearchStations";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import { Station } from "@/core/domain/station/Station";
import { StationId } from "@/core/domain/station/StationId";
import { StationName } from "@/core/domain/station/StationName";
import { StationLocation } from "@/core/domain/station/StationLocation";
import { TransportType } from "@/core/domain/shared/TransportType";

function makeStation(id: string, name: string): Station {
  return new Station(new StationId(id), new StationName(name), new StationLocation(39.47, -0.37), [
    TransportType.METRO,
  ]);
}

describe("SearchStations", () => {
  it("should delegate to searchByName and return results", async () => {
    const stations = [makeStation("S1", "Xàtiva"), makeStation("S2", "Xàtiva Nord")];
    const mockRepo: StationRepository = {
      findAll: mock(() => Promise.resolve([])),
      findById: mock(() => Promise.resolve(null)),
      findByName: mock(() => Promise.resolve(null)),
      searchByName: mock(() => Promise.resolve(stations)),
      save: mock(() => Promise.resolve()),
      saveAll: mock(() => Promise.resolve()),
      deleteByFeedId: mock(() => Promise.resolve()),
      updateTransportTypes: mock(() => Promise.resolve()),
    };

    const useCase = new SearchStations(mockRepo);
    const result = await useCase.execute("Xàtiva");

    expect(mockRepo.searchByName).toHaveBeenCalledWith("Xàtiva");
    expect(result).toEqual(stations);
  });

  it("should return empty array when no stations match", async () => {
    const mockRepo: StationRepository = {
      findAll: mock(() => Promise.resolve([])),
      findById: mock(() => Promise.resolve(null)),
      findByName: mock(() => Promise.resolve(null)),
      searchByName: mock(() => Promise.resolve([])),
      save: mock(() => Promise.resolve()),
      saveAll: mock(() => Promise.resolve()),
      deleteByFeedId: mock(() => Promise.resolve()),
      updateTransportTypes: mock(() => Promise.resolve()),
    };

    const useCase = new SearchStations(mockRepo);
    const result = await useCase.execute("nonexistent");

    expect(mockRepo.searchByName).toHaveBeenCalledWith("nonexistent");
    expect(result).toEqual([]);
  });
});
