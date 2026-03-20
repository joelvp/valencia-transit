import { describe, it, expect, mock } from "bun:test";
import { SearchStations } from "./SearchStations.ts";
import type { StationRepository } from "../../domain/station/StationRepository.ts";
import { Station } from "../../domain/station/Station.ts";
import { StationId } from "../../domain/station/StationId.ts";
import { StationName } from "../../domain/station/StationName.ts";
import { StationLocation } from "../../domain/station/StationLocation.ts";

function makeStation(id: string, name: string): Station {
  return new Station(new StationId(id), new StationName(name), new StationLocation(39.47, -0.37));
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
    };

    const useCase = new SearchStations(mockRepo);
    const result = await useCase.execute("nonexistent");

    expect(mockRepo.searchByName).toHaveBeenCalledWith("nonexistent");
    expect(result).toEqual([]);
  });
});
