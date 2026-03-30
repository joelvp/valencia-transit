import { describe, it, expect } from "bun:test";
import { RouteMapper } from "./RouteMapper";
import { Route } from "@/core/domain/route/Route";
import { RouteId } from "@/core/domain/route/RouteId";
import { RouteStation } from "@/core/domain/route/RouteStation";
import { LineId } from "@/core/domain/line/LineId";
import { StationId } from "@/core/domain/station/StationId";
import { TransportType } from "@/core/domain/shared/TransportType";

describe("RouteMapper", () => {
  describe("toDomain", () => {
    it("should convert a DB row with multiple stations to a Route domain entity", () => {
      const row = { id: "route-1", transportType: "metro", lineId: "line-1" };
      const stationRows = [{ stationId: "station-1" }, { stationId: "station-2" }];

      const route = RouteMapper.toDomain(row, "line-1", stationRows);

      expect(route).toBeInstanceOf(Route);
      expect(route.id.value).toBe("route-1");
      expect(route.lineId.value).toBe("line-1");
      expect(route.transportType.value).toBe("metro");
      expect(route.stations).toHaveLength(2);
      expect(route.stations[0]!.stationId.value).toBe("station-1");
      expect(route.stations[1]!.stationId.value).toBe("station-2");
    });

    it("should use lineId fallback when row.lineId is null", () => {
      const row = { id: "route-2", transportType: "metro", lineId: null };
      const stationRows = [{ stationId: "station-1" }];

      const route = RouteMapper.toDomain(row, "line-fallback", stationRows);

      expect(route.lineId.value).toBe("line-fallback");
    });

    it("should prefer row.lineId over the fallback when row.lineId is set", () => {
      const row = { id: "route-3", transportType: "tram", lineId: "line-from-row" };
      const stationRows: { stationId: string }[] = [];

      const route = RouteMapper.toDomain(row, "line-fallback", stationRows);

      expect(route.lineId.value).toBe("line-from-row");
    });

    it("should handle empty stations array", () => {
      const row = { id: "route-4", transportType: "metro", lineId: "line-1" };

      const route = RouteMapper.toDomain(row, "line-1", []);

      expect(route.stations).toHaveLength(0);
    });
  });

  describe("toPersistence", () => {
    it("should convert a Route domain entity to route and station insert shapes", () => {
      const stations = [
        new RouteStation(new StationId("station-1")),
        new RouteStation(new StationId("station-2")),
      ];
      const route = new Route(
        new RouteId("route-1"),
        new LineId("line-1"),
        stations,
        TransportType.METRO,
      );

      const result = RouteMapper.toPersistence(route, "metrovalencia");

      expect(result.route.id).toBe("route-1");
      expect(result.route.feedId).toBe("metrovalencia");
      expect(result.route.transportType).toBe("metro");
      expect(result.route.lineId).toBe("line-1");

      expect(result.stations).toHaveLength(2);
      expect(result.stations[0]!.routeId).toBe("route-1");
      expect(result.stations[0]!.stationId).toBe("station-1");
      expect(result.stations[0]!.feedId).toBe("metrovalencia");
      expect(result.stations[1]!.stationId).toBe("station-2");
    });

    it("should produce an empty stations array when route has no stations", () => {
      const route = new Route(
        new RouteId("route-2"),
        new LineId("line-1"),
        [],
        TransportType.METRO,
      );

      const result = RouteMapper.toPersistence(route, "metrovalencia");

      expect(result.stations).toHaveLength(0);
    });
  });

  describe("round-trip", () => {
    it("should produce an equivalent entity after toPersistence and toDomain", () => {
      const stations = [
        new RouteStation(new StationId("station-1")),
        new RouteStation(new StationId("station-2")),
      ];
      const original = new Route(
        new RouteId("route-1"),
        new LineId("line-1"),
        stations,
        TransportType.METRO,
      );

      const { route: routeRow, stations: stationRows } = RouteMapper.toPersistence(
        original,
        "metrovalencia",
      );
      const restored = RouteMapper.toDomain(routeRow, "line-1", stationRows);

      expect(restored.id.value).toBe(original.id.value);
      expect(restored.lineId.value).toBe(original.lineId.value);
      expect(restored.transportType.value).toBe(original.transportType.value);
      expect(restored.stations).toHaveLength(original.stations.length);
      expect(restored.stations[0]!.stationId.value).toBe(original.stations[0]!.stationId.value);
      expect(restored.stations[1]!.stationId.value).toBe(original.stations[1]!.stationId.value);
    });
  });
});
