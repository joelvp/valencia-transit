import { describe, it, expect } from "bun:test";
import { LiveStationMappingReport } from "./LiveStationMappingReport";
import { UnmatchedLiveStation } from "./UnmatchedLiveStation";
import { UnmatchedLiveStationReason } from "./UnmatchedLiveStationReason";
import { Station } from "@/core/domain/station/Station";
import { StationId } from "@/core/domain/station/StationId";
import { StationLocation } from "@/core/domain/station/StationLocation";

const s1 = Station.create("S1", "Xàtiva", new StationLocation(39.4667, -0.3775));
const s2 = Station.create("S2", "Colón", new StationLocation(39.4699, -0.3707));
const unmatchedLive = new UnmatchedLiveStation("X", "9", UnmatchedLiveStationReason.NO_NAME_MATCH);

describe("LiveStationMappingReport", () => {
  it("should count mapped station ids", () => {
    expect(new LiveStationMappingReport([s1.id, s2.id], []).mappedCount).toBe(2);
  });

  it("should have no issues when both lists are empty", () => {
    expect(new LiveStationMappingReport([s1.id], []).hasIssues).toBe(false);
  });

  it("should have issues with only unmatched live stations", () => {
    expect(new LiveStationMappingReport([], [unmatchedLive]).hasIssues).toBe(true);
  });

  it("should have issues with only unmatched stations", () => {
    expect(new LiveStationMappingReport([], [], [s1]).hasIssues).toBe(true);
  });

  it("should report stations missing from mapped ids", () => {
    const report = new LiveStationMappingReport([new StationId("S1")], [unmatchedLive]);

    const result = report.withCoverageOf([s1, s2]);

    expect(result.unmatchedStations).toEqual([s2]);
    expect(result.mappedStationIds).toEqual(report.mappedStationIds);
    expect(result.unmatchedLiveStations).toEqual(report.unmatchedLiveStations);
  });

  it("should not mutate the original report", () => {
    const report = new LiveStationMappingReport([s1.id], []);

    const result = report.withCoverageOf([s1, s2]);

    expect(result).not.toBe(report);
    expect(report.unmatchedStations).toEqual([]);
  });

  it("should report no unmatched stations when all are mapped", () => {
    const result = new LiveStationMappingReport([s1.id, s2.id], []).withCoverageOf([s1, s2]);
    expect(result.unmatchedStations).toEqual([]);
  });
});
