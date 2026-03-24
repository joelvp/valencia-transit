import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "../schema";
import { routes, routeStations } from "../schema";
import { RouteMapper } from "../mappers/RouteMapper";
import type { RouteRepository } from "@/core/domain/route/RouteRepository.ts";
import type { Route } from "@/core/domain/route/Route.ts";

export class RouteRepositoryDrizzle implements RouteRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async saveMany(routeList: Route[], feedId: string): Promise<void> {
    if (routeList.length === 0) return;
    const mapped = routeList.map((r) => RouteMapper.toPersistence(r, feedId));
    await this.db.insert(routes).values(mapped.map((m) => m.route)).onConflictDoNothing();
    const allStations = mapped.flatMap((m) => m.stations);
    if (allStations.length > 0) {
      await this.db.insert(routeStations).values(allStations).onConflictDoNothing();
    }
  }

  async deleteByFeedId(feedId: string): Promise<void> {
    await this.db.delete(routes).where(eq(routes.feedId, feedId));
  }
}
