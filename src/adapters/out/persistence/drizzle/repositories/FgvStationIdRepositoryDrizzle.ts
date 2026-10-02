import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";
import { fgvStationIds } from "@/adapters/out/persistence/drizzle/schema";
import { bulkInsert } from "@/adapters/out/persistence/drizzle/bulkInsert";
import type { StationId } from "@/core/domain/station/StationId";
import type { LiveStationLink } from "@/core/domain/shared/LiveStationLink";
import type { LiveStationLinkRepository } from "@/core/domain/shared/LiveStationLinkRepository";
import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

export class FgvStationIdRepositoryDrizzle implements LiveStationLinkRepository {
  constructor(
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly feedId: string,
  ) {}

  async findLiveId(stationId: StationId): Promise<string | null> {
    const rows = await this.db
      .select({ fgvStationId: fgvStationIds.fgvStationId })
      .from(fgvStationIds)
      .where(
        and(eq(fgvStationIds.stationId, stationId.value), eq(fgvStationIds.feedId, this.feedId)),
      );
    return rows[0] ? String(rows[0].fgvStationId) : null;
  }

  /** Truncate + re-insert; the caller wraps it in a transaction to keep the old links on failure. */
  async replaceAll(links: LiveStationLink[]): Promise<void> {
    const rows = links.map((link) => ({
      stationId: link.stationId.value,
      feedId: this.feedId,
      fgvStationId: this.toFgvStationId(link.liveId),
      updatedAt: new Date(),
    }));

    await this.db.delete(fgvStationIds).where(eq(fgvStationIds.feedId, this.feedId));
    if (rows.length === 0) return;
    await bulkInsert(this.db, fgvStationIds, rows);
  }

  private toFgvStationId(liveId: string): number {
    const id = Number(liveId);
    if (!Number.isInteger(id)) {
      throw new InvalidArgumentError(`FGV station id must be an integer, got "${liveId}"`);
    }
    return id;
  }
}
