import { describe, it, expect } from "bun:test";
import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";
import { StationLocation } from "@/core/domain/station/StationLocation";
import { LiveStation } from "./LiveStation";

describe("LiveStation", () => {
  it("should create with a location", () => {
    const location = new StationLocation(39.47, -0.37);
    const station = new LiveStation("10", "Colón", location);

    expect(station.liveId).toBe("10");
    expect(station.location).toBe(location);
  });

  it("should allow a null location", () => {
    expect(new LiveStation("10", "Colón", null).location).toBeNull();
  });

  it("should throw on empty liveId", () => {
    expect(() => new LiveStation(" ", "Colón", null)).toThrow(InvalidArgumentError);
  });

  it("should throw on empty name", () => {
    expect(() => new LiveStation("10", "", null)).toThrow(InvalidArgumentError);
  });
});
