---
name: new-migration
description: Guide through schema changes and Drizzle migration workflow
---

# New Migration

Guide through making schema changes and generating a Drizzle migration.

## Workflow

### 1. Modify schema

Edit `src/adapters/out/persistence/drizzle/schema.ts` with the desired changes.

### 2. Generate migration

```bash
bun run db:generate
```

This compares `schema.ts` with the last snapshot and generates SQL migration files in `drizzle/`.

### 3. Review generated SQL

Check the generated files in `drizzle/` directory. **Never manually edit generated SQL files.**

### 4. Apply migration

```bash
bun run db:migrate
```

### 5. Verify

```bash
bun run db:studio
```

Open Drizzle Studio to visually verify the schema changes.

### 6. Update mapper

If the table structure changed, update the corresponding mapper in `src/adapters/out/persistence/drizzle/mappers/`.

## Type Mapping Reference

| Drizzle                    | Postgres    | TS Runtime | Notes                                            |
| -------------------------- | ----------- | ---------- | ------------------------------------------------ |
| `varchar()`                | `VARCHAR`   | `string`   |                                                  |
| `integer()`                | `INTEGER`   | `number`   |                                                  |
| `real()`                   | `REAL`      | `number`   | For coordinates                                  |
| `boolean()`                | `BOOLEAN`   | `boolean`  |                                                  |
| `date({ mode: "string" })` | `DATE`      | `string`   | **Critical**: returns `"2026-02-24"`, not `Date` |
| `time()`                   | `TIME`      | `string`   | Returns `"14:23:00"`                             |
| `timestamp()`              | `TIMESTAMP` | `Date`     | JS Date object                                   |
| `serial()`                 | `SERIAL`    | `number`   | Auto-increment                                   |

## Schema Design Rules

- Schema serves the **domain model**, not GTFS file structure
- Each aggregate root gets a table
- Child VO collections get junction/child tables
- Application concerns (analytics, versioning) get their own tables
- Generated migration files in `drizzle/` **are committed** to the repo
