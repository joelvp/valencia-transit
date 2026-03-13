---
name: new-repository
description: Create a repository implementation following the project pattern with constructor injection and composite PKs
user-invocable: false
---

# New Repository

Create a Drizzle repository implementation for a domain aggregate.

## Location
`src/adapters/out/persistence/drizzle/repositories/<Aggregate>RepositoryDrizzle.ts`

## Template

```typescript
import { eq, and } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "../schema";
import { <aggregate>s } from "../schema";
import { <Aggregate>Mapper } from "../mappers/<Aggregate>Mapper";
// Import domain types

export class <Aggregate>RepositoryDrizzle implements <Aggregate>Repository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async findById(id: <Aggregate>Id, feedId: FeedId): Promise<<Aggregate> | null> {
    const rows = await this.db
      .select()
      .from(<aggregate>s)
      .where(and(eq(<aggregate>s.id, id.value), eq(<aggregate>s.feedId, feedId.value)));
    return rows[0] ? <Aggregate>Mapper.toDomain(rows[0]) : null;
  }

  async save(entity: <Aggregate>): Promise<void> {
    const data = <Aggregate>Mapper.toPersistence(entity);
    await this.db.insert(<aggregate>s).values(data).onConflictDoNothing();
  }

  async saveMany(entities: <Aggregate>[]): Promise<void> {
    if (entities.length === 0) return;
    const data = entities.map(<Aggregate>Mapper.toPersistence);
    await this.db.insert(<aggregate>s).values(data).onConflictDoNothing();
  }
}
```

## Critical Rules
- Constructor injection: `PostgresJsDatabase<typeof schema>` (enables test DB)
- Composite PKs: always filter by `(id, feedId)` when querying by ID
- Use mapper for all domain <-> persistence translation
- Implement the port interface from `src/core/domain/<aggregate>/<Aggregate>Repository.ts`

## Checklist
- [ ] Implements domain port interface
- [ ] Constructor injection of db instance
- [ ] Uses mapper for all translations
- [ ] Handles composite PK correctly
- [ ] Registered in `src/config/container.ts`
- [ ] Integration test created (see `new-test` skill)
