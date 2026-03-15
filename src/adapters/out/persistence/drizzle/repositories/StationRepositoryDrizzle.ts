import { eq, ilike } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { StationRepository } from "@/core/domain/station/StationRepository";
import type { Station } from "@/core/domain/station/Station";
import type { StationId } from "@/core/domain/station/StationId";
import { StationMapper } from "@/adapters/out/persistence/drizzle/mappers/StationMapper";
import { stations } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";

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
    const rows = await this.db
      .select()
      .from(stations)
      .where(ilike(stations.name, `%${query}%`));
    return rows.map((row) => StationMapper.toDomain(row));
  }

  async findAll(): Promise<Station[]> {
    const rows = await this.db.select().from(stations);
    return rows.map((row) => StationMapper.toDomain(row));
  }
}
