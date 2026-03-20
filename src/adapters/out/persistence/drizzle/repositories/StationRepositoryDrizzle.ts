import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { Station } from "@/core/domain/station/Station";
import type { StationId } from "@/core/domain/station/StationId";
import { StationMapper } from "@/adapters/out/persistence/drizzle/mappers/StationMapper";
import { stations } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";
import { bulkInsert } from "@/adapters/out/persistence/drizzle/bulkInsert";

export class StationRepositoryDrizzle implements StationRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async findById(id: StationId): Promise<Station | null> {
    const rows = await this.db.select().from(stations).where(eq(stations.id, id.value));
    return rows[0] ? StationMapper.toDomain(rows[0]) : null;
  }

  async findByName(name: string): Promise<Station | null> {
    const rows = await this.db.select().from(stations).where(eq(stations.name, name));
    return rows[0] ? StationMapper.toDomain(rows[0]) : null;
  }

  async searchByName(query: string): Promise<Station[]> {
    const rows = await this.db.execute<{
      id: string;
      name: string;
      latitude: number;
      longitude: number;
    }>(sql`
      SELECT id, name, latitude, longitude
      FROM stations
      WHERE name % ${query}::text OR name ILIKE ${"%" + query + "%"}
      ORDER BY similarity(name, ${query}::text) DESC
      LIMIT 10
    `);
    return rows.map((row) => StationMapper.toDomain(row));
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
          transportType: row.transportType,
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
}
