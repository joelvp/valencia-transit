import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";
import { fgvStationIds } from "@/adapters/out/persistence/drizzle/schema";
import { bulkInsert } from "@/adapters/out/persistence/drizzle/bulkInsert";
import { StationId } from "@/core/domain/station/StationId";
import type {
  FgvStationIdMapping,
  FgvStationIdStore,
} from "@/adapters/out/live-departures/provider-fgv/FgvStationIdStore";

export class FgvStationIdRepositoryDrizzle implements FgvStationIdStore {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async findFgvStationId(stationId: StationId, feedId: string): Promise<number | null> {
    const rows = await this.db
      .select({ fgvStationId: fgvStationIds.fgvStationId })
      .from(fgvStationIds)
      .where(and(eq(fgvStationIds.stationId, stationId.value), eq(fgvStationIds.feedId, feedId)));
    return rows[0]?.fgvStationId ?? null;
  }

  async findAll(feedId: string): Promise<FgvStationIdMapping[]> {
    const rows = await this.db
      .select()
      .from(fgvStationIds)
      .where(eq(fgvStationIds.feedId, feedId));
    return rows.map((row) => ({
      stationId: new StationId(row.stationId),
      fgvStationId: row.fgvStationId,
    }));
  }

  /** Truncate + re-insert; the caller wraps it in a transaction to keep the old mapping on failure. */
  async saveAll(mappings: FgvStationIdMapping[], feedId: string): Promise<void> {
    await this.deleteByFeedId(feedId);
    if (mappings.length === 0) return;

    const rows = mappings.map((m) => ({
      stationId: m.stationId.value,
      feedId,
      fgvStationId: m.fgvStationId,
      updatedAt: new Date(),
    }));
    await bulkInsert(this.db, fgvStationIds, rows);
  }

  async deleteByFeedId(feedId: string): Promise<void> {
    await this.db.delete(fgvStationIds).where(eq(fgvStationIds.feedId, feedId));
  }
}
