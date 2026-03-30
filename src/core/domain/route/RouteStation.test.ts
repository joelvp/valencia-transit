import { describe, it, expect } from "bun:test";
import { RouteStation } from "./RouteStation";
import { StationId } from "@/core/domain/station/StationId";

describe("RouteStation", () => {
  it("should be equal to another RouteStation with the same stationId", () => {
    const a = new RouteStation(new StationId("S1"));
    const b = new RouteStation(new StationId("S1"));
    expect(a.equals(b)).toBe(true);
  });

  it("should not be equal to a RouteStation with a different stationId", () => {
    const a = new RouteStation(new StationId("S1"));
    const b = new RouteStation(new StationId("S2"));
    expect(a.equals(b)).toBe(false);
  });
});
