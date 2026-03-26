import { describe, it, expect } from "bun:test";
import { Station } from "./Station";
import { StationId } from "./StationId";
import { StationName } from "./StationName";
import { StationLocation } from "./StationLocation";
import { TransportType } from "@/core/domain/shared/TransportType";

describe("Station", () => {
  const location = new StationLocation(39.4699, -0.3763);

  it("should create a station with VOs", () => {
    const station = new Station(new StationId("S1"), new StationName("Xàtiva"), location, [
      TransportType.METRO,
    ]);

    expect(station.id.value).toBe("S1");
    expect(station.name.value).toBe("Xàtiva");
    expect(station.location.latitude).toBe(39.4699);
    expect(station.transportTypes).toEqual([TransportType.METRO]);
  });

  it("should default to empty transportTypes when not provided", () => {
    const station = new Station(new StationId("S1"), new StationName("Xàtiva"), location);

    expect(station.transportTypes).toEqual([]);
  });

  it("should create a station via factory method", () => {
    const station = Station.create("S1", "Xàtiva", location, [TransportType.METRO]);

    expect(station.id.value).toBe("S1");
    expect(station.name.value).toBe("Xàtiva");
  });

  it("should default to empty transportTypes via factory when not provided", () => {
    const station = Station.create("S1", "Xàtiva", location);

    expect(station.transportTypes).toEqual([]);
  });

  it("should support multiple transport types for intermodal stations", () => {
    const station = Station.create("S1", "Xàtiva", location, [
      TransportType.METRO,
      TransportType.TRAM,
    ]);

    expect(station.transportTypes).toEqual([TransportType.METRO, TransportType.TRAM]);
  });

  it("should throw on empty id via factory", () => {
    expect(() => Station.create("", "Xàtiva", location)).toThrow();
  });

  it("should throw on empty name via factory", () => {
    expect(() => Station.create("S1", "", location)).toThrow();
  });

  it("should be equal to another station with the same id", () => {
    const a = Station.create("S1", "Xàtiva", location, [TransportType.METRO]);
    const b = Station.create("S1", "Different Name", new StationLocation(0, 0), [
      TransportType.TRAM,
    ]);

    expect(a.equals(b)).toBe(true);
  });

  it("should not be equal to a station with a different id", () => {
    const a = Station.create("S1", "Xàtiva", location);
    const b = Station.create("S2", "Xàtiva", location);

    expect(a.equals(b)).toBe(false);
  });
});
