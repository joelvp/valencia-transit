---
name: new-aggregate
description: Create a new domain aggregate with all required files following the project pattern
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
  ```typescript
  export interface <Aggregate>Repository {
    findById(id: <Aggregate>Id): Promise<<Aggregate> | null>;
    save(entity: <Aggregate>): Promise<void>;
  }
  ```

- **`<Aggregate>.test.ts`** — Entity behavior tests
  - `describe("<Aggregate>")` with `it("should ...")` blocks
  - Test creation via factory method
  - Test behavior methods
  - Test equality by ID
  - No mocks — pure domain logic

### 2. Application folder: `src/core/application/<context>/`

- Create the context folder if it doesn't exist
- Leave empty — use cases will be added separately with `/new-usecase`

### 3. Persistence adapter: `src/adapters/out/persistence/drizzle/`

- **`<Aggregate>RepositoryDrizzle.ts`** — Repository implementation
  - Implements `<Aggregate>Repository` port
  - Uses Drizzle queries
  - Uses mapper for domain <-> persistence translation

- **`mappers/<Aggregate>Mapper.ts`** — Domain <-> persistence mapper
  - Static `toDomain(row)` and `toPersistence(entity)` methods
  - NEVER derive domain types from Drizzle (`typeof table.$inferSelect` is WRONG)

### 4. Registration in `src/config/container.ts`

- Instantiate the repository adapter
- Add to the container return type

## Checklist

After creation, verify:
- [ ] All files follow naming conventions (PascalCase, one class per file)
- [ ] Domain has zero imports from outside `core/domain/`
- [ ] Port interface is in domain, implementation in adapters
- [ ] Tests pass with `bun test`
