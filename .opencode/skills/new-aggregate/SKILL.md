---
name: new-aggregate
description: Create a new domain aggregate with all required files following the project pattern. Use when user wants to create a new domain entity with repository, tests, and persistence adapter.
---

# New Aggregate

Create a new domain aggregate scaffold. The aggregate name is provided via `$ARGUMENTS` (e.g., `/new-aggregate Bus`).

## Aggregate Folder Pattern

Every aggregate in `src/core/domain/<aggregate>/` must contain:

| File                       | Required?            | Rule                                          |
| -------------------------- | -------------------- | --------------------------------------------- |
| `<Aggregate>.ts`           | Always               | Aggregate root entity                         |
| `<Aggregate>Id.ts`         | Always               | ID value object (`extends StringValueObject`) |
| `<Name>VO.ts`              | As needed            | One file per value object                     |
| `<Aggregate>Repository.ts` | Always               | Port interface for persistence                |
| `<Aggregate>.test.ts`      | Always               | Entity behavior tests                         |
| `<VO>.test.ts`             | Only if VO has logic | VOs with computation/comparison need own test |
| `index.ts`                 | Always               | Barrel export for the aggregate               |

Cross-aggregate VOs (e.g., `TimeOfDay`, `Departure`, `StringValueObject`) live in `src/core/domain/shared/`.

## Files to Create

Given aggregate name `<Aggregate>` (PascalCase), create:

### 1. Domain folder: `src/core/domain/<aggregate>/`

- **`<Aggregate>.ts`** — Aggregate root entity
  - Private constructor, static `create()` factory method
  - Takes `<Aggregate>Id` and relevant VOs as params
  - Include `equals()` comparing by ID
  - Add meaningful behavior methods (not just getters)

- **`<Aggregate>Id.ts`** — Identity value object
  ```typescript
  import { StringValueObject } from "@/core/domain/shared/StringValueObject";
  export class <Aggregate>Id extends StringValueObject {}
  ```

- **`<Aggregate>Repository.ts`** — Port interface
  - Include common methods: `findById`, `save`, plus aggregate-specific queries
  - Add methods based on aggregate needs (e.g., `findByName`, `findAll`, `searchByName`)
  ```typescript
  export interface <Aggregate>Repository {
    findById(id: <Aggregate>Id): Promise<<Aggregate> | null>;
    save(entity: <Aggregate>): Promise<void>;
    // Add aggregate-specific methods here
  }
  ```

- **`<Aggregate>.test.ts`** — Entity behavior tests
  - `describe("<Aggregate>")` with `it("should ...")` blocks
  - Test creation via factory method
  - Test behavior methods
  - Test equality by ID
  - No mocks — pure domain logic

- **`index.ts`** — Barrel exports
  ```typescript
  export * from "./<Aggregate>.js";
  export * from "./<Aggregate>Id.js";
  export * from "./<Aggregate>Repository.js";
  // Export VOs as needed
  ```

### 2. Application folder: `src/core/application/<context>/`

- Create the context folder if it doesn't exist
- Leave empty — use cases will be added separately with `/new-usecase`

### 3. Drizzle schema: `src/adapters/out/persistence/drizzle/schema.ts`

- Add the new aggregate table definition
- Follow existing patterns (e.g., `stations`, `trips` tables)

### 4. Persistence adapter: `src/adapters/out/persistence/drizzle/`

- **`repositories/<Aggregate>RepositoryDrizzle.ts`** — Repository implementation
  - Implements `<Aggregate>Repository` port
  - Uses Drizzle queries
  - Uses mapper for domain <-> persistence translation

- **`mappers/<Aggregate>Mapper.ts`** — Domain <-> persistence mapper
  - Define explicit `Row` and `Insert` types (NOT using `$inferSelect` or `$inferInsert`)
  - Static `toDomain(row)` and `toPersistence(entity)` methods

### 5. Registration in DI container

The DI container lives at `src/adapters/container.ts` (NOT in `config/` since it must import adapters).

- Import and instantiate the repository adapter
- Add to the container return type
- Example pattern:
  ```typescript
  const stationRepo = new StationRepositoryDrizzle(db);
  // ...
  return {
    stationRepository: stationRepo,
    // ...
  };
  ```

## Checklist

After creation, verify:
- [ ] All files follow naming conventions (PascalCase, one class per file)
- [ ] Domain has zero imports from outside `core/domain/`
- [ ] Port interface is in domain, implementation in adapters
- [ ] Mapper uses explicit types, NOT `typeof table.$inferSelect`
- [ ] DI container updated at `src/adapters/container.ts`
- [ ] Tests pass with `bun test`
