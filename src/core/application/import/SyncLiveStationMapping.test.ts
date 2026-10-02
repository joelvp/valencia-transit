import { describe, it, expect, mock } from "bun:test";
import { SyncLiveStationMapping } from "./SyncLiveStationMapping";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { LiveStationMapping } from "@/core/domain/shared/LiveStationMapping";
import { LiveStationMappingReport } from "@/core/domain/shared/LiveStationMappingReport";
import { StationId } from "@/core/domain/station/StationId";
import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";

const stations = [
  Station.create("S1", "Xàtiva", new StationLocation(39.4667, -0.3775)),
  Station.create("S2", "Colón", new StationLocation(39.4699, -0.3707)),
];

function makeRepo(): StationRepository {
  return {
    findById: mock(() => Promise.resolve(null)),
    findByName: mock(() => Promise.resolve(null)),
    searchByName: mock(() => Promise.resolve([])),
    findAll: mock(() => Promise.resolve(stations)),
    save: mock(() => Promise.resolve()),
    saveAll: mock(() => Promise.resolve()),
    deleteByFeedId: mock(() => Promise.resolve()),
    updateTransportTypes: mock(() => Promise.resolve()),
  };
}

describe("SyncLiveStationMapping", () => {
  it("should pass all stations to the mapping", async () => {
    const mapping: LiveStationMapping = {
      sync: mock(() => Promise.resolve(new LiveStationMappingReport([], []))),
    };

    await new SyncLiveStationMapping(makeRepo(), mapping).execute();

    expect(mapping.sync).toHaveBeenCalledWith(stations);
  });

  it("should report stations that did not get a live id", async () => {
    const report = new LiveStationMappingReport([new StationId("S1")], []);
    const mapping: LiveStationMapping = { sync: mock(() => Promise.resolve(report)) };

    const result = await new SyncLiveStationMapping(makeRepo(), mapping).execute();

    expect(result.mappedCount).toBe(1);
    expect(result.unmatchedStations).toEqual(stations.slice(1));
    expect(result.hasIssues).toBe(true);
  });

  it("should propagate sync errors", async () => {
    const mapping: LiveStationMapping = { sync: mock(() => Promise.reject(new Error("boom"))) };

    expect(new SyncLiveStationMapping(makeRepo(), mapping).execute()).rejects.toThrow("boom");
  });
});
