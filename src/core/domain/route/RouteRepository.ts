import type { Route } from "./Route.ts";
import type { RouteId } from "./RouteId.ts";

export interface RouteRepository {
  findLineIdsByRouteIds(routeIds: RouteId[]): Promise<Map<string, string>>;
  saveMany(routes: Route[], feedId: string): Promise<void>;
  deleteByFeedId(feedId: string): Promise<void>;
}
