import { eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";
import { routes, routeStations } from "@/adapters/out/persistence/drizzle/schema";
import { RouteMapper } from "@/adapters/out/persistence/drizzle/mappers/RouteMapper";
import type { RouteRepository } from "@/core/domain/route/RouteRepository.ts";
import type { Route } from "@/core/domain/route/Route.ts";
import type { RouteId } from "@/core/domain/route/RouteId.ts";

export class RouteRepositoryDrizzle implements RouteRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async findLineIdsByRouteIds(routeIds: RouteId[]): Promise<Map<string, string>> {
    if (routeIds.length === 0) return new Map();

    const rows = await this.db
      .select({ id: routes.id, lineId: routes.lineId })
      .from(routes)
      .where(inArray(routes.id, routeIds.map((r) => r.value)));

    const result = new Map<string, string>();
    for (const row of rows) {
      if (row.lineId) result.set(row.id, row.lineId);
    }
    return result;
  }

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
