import { describe, it, expect } from "bun:test";
import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";
import { LiveStation } from "./LiveStation";
import { MatchLiveStations } from "./MatchLiveStations";
import { UnmatchedLiveStation } from "./UnmatchedLiveStation";
import { UnmatchedLiveStationReason } from "./UnmatchedLiveStationReason";

const LAT = 39.47;
const LON = -0.37;

function ours(id: string, name: string, lat = LAT, lon = LON): Station {
  return Station.create(id, name, new StationLocation(lat, lon));
}

function live(id: string, name: string, lat = LAT, lon = LON): LiveStation {
  return new LiveStation(id, name, new StationLocation(lat, lon));
}

function pairs(links: { stationId: { value: string }; liveId: string }[]) {
  return links.map((l) => [l.stationId.value, l.liveId]);
}

describe("MatchLiveStations", () => {
  it("should link a station with the same name within the distance limit", () => {
    const result = MatchLiveStations.match(
      [ours("s1", "Colón")],
      [live("10", "Colón", LAT + 0.0005)],
    );

    expect(pairs(result.links)).toEqual([["s1", "10"]]);
    expect(result.unmatchedLiveStations).toEqual([]);
  });

  it("should match names ignoring accents and case", () => {
    const result = MatchLiveStations.match([ours("s1", "Xàtiva")], [live("1", "XATIVA")]);

    expect(pairs(result.links)).toEqual([["s1", "1"]]);
  });

  it("should match names ignoring punctuation", () => {
    const result = MatchLiveStations.match(
      [ours("s1", "Sant Isidre")],
      [live("2", "Sant Isidre.")],
    );

    expect(pairs(result.links)).toEqual([["s1", "2"]]);
  });

  it("should match names ignoring middle dots and apostrophes", () => {
    const result = MatchLiveStations.match([ours("s1", "L'Eliana")], [live("3", "LEliana")]);

    expect(pairs(result.links)).toEqual([["s1", "3"]]);
  });

  it("should pick the closest station when several share the same normalized name", () => {
    const near = ours("near", "Alboraya", LAT + 0.001);
    const far = ours("far", "ALBORAYA", LAT + 0.003);

    const result = MatchLiveStations.match([far, near], [live("3", "Alboraya")]);

    expect(pairs(result.links)).toEqual([["near", "3"]]);
  });

  it("should report TOO_FAR and not link when the name matches but is too far", () => {
    const result = MatchLiveStations.match([ours("s1", "Colón")], [live("4", "Colón", LAT + 0.01)]);

    expect(result.links).toEqual([]);
    expect(result.unmatchedLiveStations).toEqual([
      new UnmatchedLiveStation("Colón", "4", UnmatchedLiveStationReason.TOO_FAR),
    ]);
  });

  it("should report NO_NAME_MATCH when no station has the name", () => {
    const result = MatchLiveStations.match([ours("s1", "Colón")], [live("5", "Nowhere")]);

    expect(result.links).toEqual([]);
    expect(result.unmatchedLiveStations).toEqual([
      new UnmatchedLiveStation("Nowhere", "5", UnmatchedLiveStationReason.NO_NAME_MATCH),
    ]);
  });

  it("should report INVALID_COORDINATES when the live station has no location", () => {
    const result = MatchLiveStations.match(
      [ours("s1", "Colón")],
      [new LiveStation("6", "Colón", null)],
    );

    expect(result.links).toEqual([]);
    expect(result.unmatchedLiveStations).toEqual([
      new UnmatchedLiveStation("Colón", "6", UnmatchedLiveStationReason.INVALID_COORDINATES),
    ]);
  });

  it("should keep the closer live station and report the later one as DUPLICATE", () => {
    const result = MatchLiveStations.match(
      [ours("s1", "Colón")],
      [live("7", "Colón", LAT + 0.0001), live("8", "Colón", LAT + 0.002)],
    );

    expect(pairs(result.links)).toEqual([["s1", "7"]]);
    expect(result.unmatchedLiveStations).toEqual([
      new UnmatchedLiveStation("Colón", "8", UnmatchedLiveStationReason.DUPLICATE),
    ]);
  });

  it("should replace an earlier link when a later live station is closer", () => {
    const result = MatchLiveStations.match(
      [ours("s1", "Colón")],
      [live("8", "Colón", LAT + 0.002), live("7", "Colón", LAT + 0.0001)],
    );

    expect(pairs(result.links)).toEqual([["s1", "7"]]);
    expect(result.unmatchedLiveStations).toEqual([
      new UnmatchedLiveStation("Colón", "8", UnmatchedLiveStationReason.DUPLICATE),
    ]);
  });

  it("should keep the first live station on an exact distance tie", () => {
    const result = MatchLiveStations.match(
      [ours("s1", "Colón")],
      [live("7", "Colón", LAT + 0.001), live("8", "Colón", LAT + 0.001)],
    );

    expect(pairs(result.links)).toEqual([["s1", "7"]]);
    expect(result.unmatchedLiveStations).toEqual([
      new UnmatchedLiveStation("Colón", "8", UnmatchedLiveStationReason.DUPLICATE),
    ]);
  });

  it("should return empty results for empty inputs", () => {
    expect(MatchLiveStations.match([], [])).toEqual({ links: [], unmatchedLiveStations: [] });
  });
});
