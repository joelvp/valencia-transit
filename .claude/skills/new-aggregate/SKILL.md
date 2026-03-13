---
name: new-aggregate
description: Create a new domain aggregate with all required files following the project pattern. Use when user wants to create a new domain entity with repository, tests, and persistence adapter.
user-invocable: true
---

**MANDATORY FIRST STEP — run this before anything else:**
```bash
bun ./.claude/hooks/echo_skill_start.ts new-aggregate
```

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
| `<VO>.test.ts`             | Only if VO has logic | VOs with methods beyond "non-empty" need own test; simple `StringValueObject` subclasses are covered by `StringValueObject.test.ts` |

Cross-aggregate VOs (e.g., `TimeOfDay`, `Departure`, `StringValueObject`) live in `src/core/domain/shared/`.

## Files to Create

Given aggregate name `<Aggregate>` (PascalCase), create:

### 1. Domain folder: `src/core/domain/<aggregate>/`

- **`<Aggregate>.ts`** — Aggregate root entity
  - Public constructor taking typed VOs as params (not primitives)
  - `equals()` comparing by ID
  - Meaningful behavior methods — entities should own logic, not just hold data
  - `static create()` is useful when **data arrives from outside the system right now** — a Telegram command, an admin form, an external API. It wraps primitive → VO construction and acts as the validation barrier: invalid strings throw `InvalidArgumentError` before reaching the domain. Example: `/salida Xàtiva Colón` → `SearchNextDepartures` creates `StationId` from user-typed strings.
  - When the entity is only ever reconstructed from the DB (mapper receives already-stored data), `new Aggregate(vo1, vo2)` is sufficient — `Line`, `Schedule`, and `Trip` work this way.

  ```typescript
  export class Station {
    constructor(
      readonly id: StationId,
      readonly name: StationName,
      readonly location: StationLocation,
    ) {}

    // Has create() because stations are created from external data (GTFS import, future admin input)
    static create(id: string, name: string, location: StationLocation): Station {
      return new Station(new StationId(id), new StationName(name), location);
    }

    equals(other: Station): boolean {
      return this.id.equals(other.id);
    }
  }
  ```

- **`<Aggregate>Id.ts`** — Identity value object
  ```typescript
  import { StringValueObject } from "../shared/StringValueObject.ts";
  export class <Aggregate>Id extends StringValueObject {}
  ```
  Note: use relative `.ts` extensions for all imports in this project.

- **String VOs** — extend `StringValueObject` for string properties with identity or validation:
  ```typescript
  import { StringValueObject } from "../shared/StringValueObject.ts";
  export class <Name> extends StringValueObject {}
  ```

- **Numeric VOs** — write by hand (no shared base class exists):
  ```typescript
  import { InvalidArgumentError } from "../error/InvalidArgumentError.ts";
  export class <Name> {
    constructor(readonly value: number) {
      if (value <= 0) throw new InvalidArgumentError("<Name> must be positive");
    }
    equals(other: <Name>): boolean { return this.value === other.value; }
  }
  ```

- **`<Aggregate>Repository.ts`** — Port interface
  - Include `findById`, `save`, plus aggregate-specific queries
  ```typescript
  import type { <Aggregate> } from "./<Aggregate>.ts";
  import type { <Aggregate>Id } from "./<Aggregate>Id.ts";

  export interface <Aggregate>Repository {
    findById(id: <Aggregate>Id): Promise<<Aggregate> | null>;
    save(entity: <Aggregate>): Promise<void>;
    // Add aggregate-specific query methods here
  }
  ```

- **`<Aggregate>.test.ts`** — Entity behavior tests
  - `describe("<Aggregate>")` with `it("should ...")` blocks
  - Test construction via `new <Aggregate>(vo1, vo2, ...)` and via `static create()`
  - Test `create()` throws on invalid input (empty strings, negative numbers, etc.)
  - Test behavior methods
  - Test equality by ID
  - No mocks — pure domain logic

  ```typescript
  import { describe, it, expect } from "bun:test";
  import { Station } from "./Station.ts";
  import { StationId } from "./StationId.ts";
  import { StationName } from "./StationName.ts";
  import { StationLocation } from "./StationLocation.ts";

  // Helper to avoid repeating VO construction in every test
  function makeStation(id = "S1", name = "Xàtiva"): Station {
    return new Station(new StationId(id), new StationName(name), new StationLocation(39.47, -0.37));
  }

  describe("Station", () => {
    it("should create a station with valid data", () => {
      const s = makeStation();
      expect(s.id.value).toBe("S1");
    });
    it("should throw on empty id", () => {
      expect(() => new Station(new StationId(""), ...)).toThrow();
    });
    it("should be equal to another station with the same id", () => {
      expect(makeStation("S1").equals(makeStation("S1", "Other"))).toBe(true);
    });
  });
  ```

### 2. Application folder: `src/core/application/<context>/`

- Create the context folder if it doesn't exist
- Leave empty — use cases will be added separately with `/new-usecase`

## Next Steps

The domain scaffold is now complete. Continue with the `persistence` agent:

1. **Schema + migration** → `new-migration` — add the table to `schema.ts` and generate the migration
2. **Mapper** → `new-mapper` — create `<Aggregate>Mapper.ts`
3. **Repository** → `new-repository` — create `<Aggregate>RepositoryDrizzle.ts` and wire it in `container.ts`

Then, to expose the aggregate via the bot:

4. **Use case** → `/new-usecase <UseCaseName>`
5. **Handler** → `/new-handler <handlerName>`

## Checklist

After creation, verify:
- [ ] All files follow naming conventions (PascalCase, one class per file)
- [ ] All imports use `.ts` extensions (e.g. `"./StationId.ts"`, `"../shared/StringValueObject.ts"`)
- [ ] Domain has zero imports from outside `core/domain/`
- [ ] Port interface is in domain, implementation in adapters
- [ ] Tests pass with `bun test`
