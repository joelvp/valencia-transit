import type { Route } from "./Route.ts";

export interface RouteRepository {
  saveMany(routes: Route[], feedId: string): Promise<void>;
  deleteByFeedId(feedId: string): Promise<void>;
}
