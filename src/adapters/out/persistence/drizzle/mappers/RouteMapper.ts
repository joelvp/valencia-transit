import { Route } from "@/core/domain/route/Route.ts";
import { RouteId } from "@/core/domain/route/RouteId.ts";
import { RouteStation } from "@/core/domain/route/RouteStation.ts";
import { LineId } from "@/core/domain/line/LineId.ts";
import { StationId } from "@/core/domain/station/StationId.ts";
import { TransportType } from "@/core/domain/shared/TransportType.ts";

type RouteRow = {
  id: string;
  transportType: string;
};

type RouteStationRow = {
  stationId: string;
};

type RouteInsert = {
  id: string;
  feedId: string;
  transportType: string;
};

type RouteStationInsert = {
  routeId: string;
  stationId: string;
  feedId: string;
};

export type RoutePersistenceResult = {
  route: RouteInsert;
  stations: RouteStationInsert[];
};

export const RouteMapper = {
  toDomain(row: RouteRow, lineId: string, stationRows: RouteStationRow[]): Route {
    return new Route(
      new RouteId(row.id),
      new LineId(lineId),
      stationRows.map((s) => new RouteStation(new StationId(s.stationId))),
      new TransportType(row.transportType),
    );
  },

  toPersistence(route: Route, feedId: string): RoutePersistenceResult {
    return {
      route: {
        id: route.id.value,
        feedId,
        transportType: route.transportType.value,
      },
      stations: route.stations.map((s) => ({
        routeId: route.id.value,
        stationId: s.stationId.value,
        feedId,
      })),
    };
  },
};
