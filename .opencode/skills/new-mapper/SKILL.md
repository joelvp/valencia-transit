---
name: new-mapper
description: Create a domain-to-persistence mapper following the project pattern
---

# New Mapper

Create a domain-to-persistence mapper for an aggregate. Used by the persistence agent when setting up data mapping.

## File Location

`src/adapters/out/persistence/drizzle/mappers/<Aggregate>Mapper.ts`

## Template

```typescript
import { <Aggregate> } from "@/core/domain/<aggregate>/<Aggregate>";
import { <Aggregate>Id } from "@/core/domain/<aggregate>/<Aggregate>Id";
// ... other VO imports

type <Aggregate>Row = {
  id: string;
  // ... columns returned by SELECT (no feedId — it's a filter, not a domain field)
};

type <Aggregate>Insert = {
  id: string;
  feedId: string;
  // ... all columns needed for INSERT
};

export const <Aggregate>Mapper = {
  toDomain(row: <Aggregate>Row): <Aggregate> {
    return <Aggregate>.create(
      new <Aggregate>Id(row.id),
      // ... map other columns to VOs
    );
  },

  toPersistence(entity: <Aggregate>, feedId: string): <Aggregate>Insert {
    return {
      id: entity.id.value,
      feedId,
      // ... map VOs to plain values
    };
  },
};
```

## Rules

- **NEVER** use `InferSelectModel`, `InferInsertModel`, `$inferSelect`, or `$inferInsert` — define explicit `Row` and `Insert` types manually
- **Object literal**, not a class — `export const Mapper = { toDomain, toPersistence }`
- `toDomain` constructs domain entities with proper VOs from flat DB rows
- `toPersistence` takes the entity **and `feedId: string`** as parameters — `feedId` is a persistence concern, not part of the domain model
- `Row` type reflects what SELECT returns (typically excludes `feedId`)
- `Insert` type includes all columns needed for INSERT (including `feedId`)
- One mapper per aggregate
