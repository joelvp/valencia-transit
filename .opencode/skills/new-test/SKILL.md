---
name: new-test
description: Create a test file for an existing source file, auto-detecting the correct test type and patterns
---

# New Test

Create a test file for an existing source file. The source file path is provided via `$ARGUMENTS` (e.g., `/new-test src/core/domain/station/Station.ts`).

## Auto-Detection Rules

Determine test type based on the source file location:

### `core/domain/**` → Unit Test
- **Mock nothing** — pure logic, no dependencies
- Test entity behavior, VO validation, domain rules
- Test creation via factory methods
- Test equality semantics (by ID for entities, by value for VOs)

### `core/application/**` → Unit Test
- **Mock ALL ports** (repos, event bus, etc.)
- Test orchestration: correct calls, correct order, correct results
- Use real domain entities, only mock infrastructure ports

### `adapters/out/**` → Integration Test
- **Mock nothing** — use real database
- Test SQL queries, mappers, data integrity
- Set up database cleanup in `beforeEach`/`afterEach`

### `adapters/in/**` → Integration Test
- **Mock use cases** (the application layer)
- Test input parsing, response formatting, error handling

## File Creation

Create `<FileName>.test.ts` co-located next to the source file.

```typescript
import { describe, it, expect } from "bun:test";

describe("<ClassName>", () => {
  it("should <expected behavior>", () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Rules

- **Runner**: `bun test`
- **Naming**: `describe("ClassName")` -> `it("should <behavior>")`
- **Test behavior**, not implementation — assert outputs and side effects
- **No shared mutable fixtures** — create test data inside each test
- **Co-located**: test file lives next to the source file
- Read the source file first to understand what behaviors to test

## Database Cleanup (Integration Tests)

Strategy in order of preference:

1. **Transaction rollback** — wrap each test in a transaction, roll back after. Fastest.
2. **Truncate in `beforeEach`** — if transactions aren't feasible.
3. **Dedicated test database** — `metrovalencia_test`, fully wiped between runs.

### Integration Test DB Connection Pattern

**Critical**: Never export a module-level DB singleton shared across test files. When one file's `afterAll` calls `sql.end()`, it terminates the shared connection and all subsequent test files fail with `CONNECTION_ENDED`.

**Correct pattern** — `createTestSetup()` factory, one connection per test file:

```typescript
import { createTestSetup } from "./test-db-helper";
import { stations } from "../schema";

describe("StationRepositoryDrizzle", () => {
  const { db, cleanDatabase, closeDatabase } = createTestSetup();

  beforeEach(async () => {
    await cleanDatabase(); // truncate relevant tables
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("should save and retrieve a station", async () => {
    // Arrange + Act + Assert inside the test
  });
});
```

## Mocking Patterns

### Application layer — mock all ports

```typescript
import { describe, it, expect, mock } from "bun:test";

const mockRepo: StationRepository = {
  findById: mock(() => Promise.resolve(null)),
  findAll: mock(() => Promise.resolve([])),
  save: mock(() => Promise.resolve()),
  saveMany: mock(() => Promise.resolve()),
};

const useCase = new SearchNextDepartures(mockRepo, mockLineRepo, mockTripRepo);
```

### Driving adapters — mock use cases

```typescript
const mockUseCase = {
  execute: mock(() => Promise.resolve(expectedResult)),
};

// Pass to handler/controller
```

## VO Testing Strategy

Not all VOs need their own test file. Test a VO only if it has meaningful logic beyond validation + equality:

| VO Category | Needs Test? | Examples |
|-------------|-------------|---------|
| `StringValueObject` base class | Yes (once) | Covers all ID/name VOs |
| VOs with computation/comparison logic | Yes | `isAfter()`, `contains()`, `isActiveOnDay()` |
| VOs with boundary validation beyond non-empty | Yes | Lat/lon ranges, numeric constraints |
| Simple string VOs (extend `StringValueObject`) | No | Covered by base class test |
| Enums | No | No logic to test |
| Pure composite VOs (just group other VOs) | No | Only hold data |
| VOs with trivial boolean getters | No | Test via entity that uses them |
