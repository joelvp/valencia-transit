import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { DomainEvent } from "@/core/domain/event/DomainEvent";
import type { DomainEventRepository } from "@/core/domain/event/DomainEventRepository";
import type { DomainEventType } from "@/core/domain/event/DomainEventType";
import type { StoredDomainEvent } from "@/core/domain/event/StoredDomainEvent";
import { DomainEventMapper } from "@/adapters/out/persistence/drizzle/mappers/DomainEventMapper";
import { domainEvents } from "@/adapters/out/persistence/drizzle/schema";
import type * as schema from "@/adapters/out/persistence/drizzle/schema";

export class DomainEventRepositoryDrizzle implements DomainEventRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async save(event: DomainEvent): Promise<void> {
    const data = DomainEventMapper.toPersistence(event);
    await this.db.insert(domainEvents).values(data);
  }

  async findAll(): Promise<StoredDomainEvent[]> {
    const rows = await this.db.select().from(domainEvents);
    return rows.map((row) => DomainEventMapper.toDomain(row));
  }

  async findByType(type: DomainEventType): Promise<StoredDomainEvent[]> {
    const rows = await this.db.select().from(domainEvents).where(eq(domainEvents.type, type));
    return rows.map((row) => DomainEventMapper.toDomain(row));
  }

  async findByAggregateId(aggregateId: string): Promise<StoredDomainEvent[]> {
    const rows = await this.db
      .select()
      .from(domainEvents)
      .where(eq(domainEvents.aggregateId, aggregateId));
    return rows.map((row) => DomainEventMapper.toDomain(row));
  }
}
