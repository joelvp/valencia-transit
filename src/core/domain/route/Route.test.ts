import { describe, it, expect } from "bun:test";
import { Route } from "./Route.ts";
import { RouteId } from "./RouteId.ts";
import { RouteStation } from "./RouteStation.ts";
import { LineId } from "../line/LineId.ts";
import { StationId } from "../station/StationId.ts";

function makeRoute(routeId = "V4-114-98", lineId = "4"): Route {
  return new Route(new RouteId(routeId), new LineId(lineId), [
    new RouteStation(new StationId("S1")),
    new RouteStation(new StationId("S2")),
  ]);
}

describe("Route", () => {
  it("should construct with id, lineId, and stations", () => {
    const route = makeRoute();
    expect(route.id.value).toBe("V4-114-98");
    expect(route.lineId.value).toBe("4");
    expect(route.stations).toHaveLength(2);
  });

  it("should be equal to another route with the same id", () => {
    const a = makeRoute("V4-114-98", "4");
    const b = makeRoute("V4-114-98", "5");
    expect(a.equals(b)).toBe(true);
  });

  it("should not be equal to a route with a different id", () => {
    const a = makeRoute("V4-114-98");
    const b = makeRoute("V4-115-99");
    expect(a.equals(b)).toBe(false);
  });

  it("should allow an empty stations list", () => {
    const route = new Route(new RouteId("R1"), new LineId("1"), []);
    expect(route.stations).toHaveLength(0);
  });
});

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
