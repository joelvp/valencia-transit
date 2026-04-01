import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AnalyticsEvent } from "@/core/domain/event/AnalyticsEvent";
import type { AnalyticsEventRepository } from "@/core/domain/event/AnalyticsEventRepository";
import type { AnalyticsEventType } from "@/core/domain/event/AnalyticsEventType";
import type { StoredAnalyticsEvent } from "@/core/domain/event/StoredAnalyticsEvent";
import { AnalyticsEventMapper } from "@/adapters/out/persistence/drizzle/mappers/AnalyticsEventMapper";
import { analyticsEvents } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";

export class AnalyticsEventRepositoryDrizzle implements AnalyticsEventRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async save(event: AnalyticsEvent): Promise<void> {
    const data = AnalyticsEventMapper.toPersistence(event);
    await this.db.insert(analyticsEvents).values(data);
  }

  async findAll(): Promise<StoredAnalyticsEvent[]> {
    const rows = await this.db.select().from(analyticsEvents);
    return rows.map((row) => AnalyticsEventMapper.toDomain(row));
  }

  async findByType(type: AnalyticsEventType): Promise<StoredAnalyticsEvent[]> {
    const rows = await this.db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.type, type));
    return rows.map((row) => AnalyticsEventMapper.toDomain(row));
  }

  async findByUserId(userId: string): Promise<StoredAnalyticsEvent[]> {
    const rows = await this.db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.aggregateId, userId));
    return rows.map((row) => AnalyticsEventMapper.toDomain(row));
  }
}
