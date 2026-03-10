---
name: new-test
description: Create a test file for an existing source file, auto-detecting the correct test type and patterns
user-invocable: true
hooks:
  PreToolUse:
    - matcher: "Bash"
      command: "bun ./.claude/scripts/echo_skill_start.ts"
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
