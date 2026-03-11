---
name: new-mapper
description: Create a domain-to-persistence mapper following the project pattern
user-invocable: false
---

**MANDATORY FIRST STEP — run this before anything else:**
```bash
bun ./.claude/hooks/echo_skill_start.ts new-mapper
```

# New Mapper

Create a domain-to-persistence mapper for an aggregate. Used by the persistence agent when setting up data mapping.

## File Location

`src/adapters/out/persistence/drizzle/mappers/<Aggregate>Mapper.ts`

## Template

```typescript
import { <Aggregate> } from "@/core/domain/<aggregate>/<Aggregate>";
import { <Aggregate>Id } from "@/core/domain/<aggregate>/<Aggregate>Id";
// ... other VO imports

// Import Drizzle schema types
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { <tableName> } from "../schema";

type <Aggregate>Row = InferSelectModel<typeof <tableName>>;
type <Aggregate>Insert = InferInsertModel<typeof <tableName>>;

export class <Aggregate>Mapper {
  static toDomain(row: <Aggregate>Row): <Aggregate> {
    return <Aggregate>.create(
      new <Aggregate>Id(row.id),
      // ... map other columns to VOs
    );
  }

  static toPersistence(entity: <Aggregate>): <Aggregate>Insert {
    return {
      id: entity.id.value,
      // ... map VOs to plain values
    };
  }
}
```

## Rules

- **NEVER** derive domain types from Drizzle: `typeof table.$inferSelect` as domain type is WRONG
- Domain defines its own types; the mapper handles translation
- `toDomain` constructs domain entities with proper VOs from flat DB rows
- `toPersistence` extracts primitive values from VOs for DB insertion
- Static methods only — mappers are stateless
- One mapper per aggregate
