import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import Fuse from "fuse.js";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { Station } from "@/core/domain/station/Station";
import type { StationId } from "@/core/domain/station/StationId";
import type { TransportType } from "@/core/domain/shared/TransportType";
import { StationMapper } from "@/adapters/out/persistence/drizzle/mappers/StationMapper";
import { stations } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";
import { bulkInsert } from "@/adapters/out/persistence/drizzle/bulkInsert";

type FuseItem = { original: Station; normalized: string };

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f·']/g, "")
    .toLowerCase();
}

export class StationRepositoryDrizzle implements StationRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  private fuseIndex: Fuse<FuseItem> | null = null;

  async findById(id: StationId): Promise<Station | null> {
    const rows = await this.db.select().from(stations).where(eq(stations.id, id.value));
    return rows[0] ? StationMapper.toDomain(rows[0]) : null;
  }

  async findByName(name: string): Promise<Station | null> {
    const rows = await this.db.select().from(stations).where(eq(stations.name, name));
    return rows[0] ? StationMapper.toDomain(rows[0]) : null;
  }

  async searchByName(query: string): Promise<Station[]> {
    if (!this.fuseIndex) {
      const all = await this.findAll();
      const items: FuseItem[] = all.map((s) => ({
        original: s,
        normalized: normalize(s.name.value),
      }));
      this.fuseIndex = new Fuse(items, {
        keys: ["normalized"],
        threshold: 0.35,
        minMatchCharLength: 2,
        includeScore: true,
        ignoreLocation: true,
      });
    }

    const results = this.fuseIndex.search(normalize(query));
    return results.slice(0, 5).map((r) => r.item.original);
  }

  async findAll(): Promise<Station[]> {
    const rows = await this.db.select().from(stations);
    return rows.map((row) => StationMapper.toDomain(row));
  }

  async save(station: Station, feedId: string): Promise<void> {
    const row = StationMapper.toPersistence(station, feedId);
    await this.db
      .insert(stations)
      .values(row)
      .onConflictDoUpdate({
        target: [stations.id, stations.feedId],
        set: {
          name: row.name,
          latitude: row.latitude,
          longitude: row.longitude,
          transportTypes: row.transportTypes,
        },
      });
  }

  async saveAll(stationList: Station[], feedId: string): Promise<void> {
    const rows = stationList.map((s) => StationMapper.toPersistence(s, feedId));
    await bulkInsert(this.db, stations, rows);
  }

  async deleteByFeedId(feedId: string): Promise<void> {
    await this.db.delete(stations).where(eq(stations.feedId, feedId));
  }

  async updateTransportTypes(
    transportTypesByStation: Map<string, TransportType[]>,
    feedId: string,
  ): Promise<void> {
    if (transportTypesByStation.size === 0) return;
    for (const [stationId, types] of transportTypesByStation) {
      await this.db
        .update(stations)
        .set({ transportTypes: types.map((t) => t.value) })
        .where(and(eq(stations.id, stationId), eq(stations.feedId, feedId)));
    }
  }
}
