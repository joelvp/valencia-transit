---
name: new-usecase
description: Create a new use case with co-located test following the project pattern
user-invocable: true
---

**MANDATORY FIRST STEP — run this before anything else:**
```bash
bun ./.claude/hooks/echo_skill_start.ts new-usecase
```

# New Use Case

Create a new use case with its co-located test. The use case name is provided via `$ARGUMENTS` (e.g., `/new-usecase SearchNextDepartures`).

## Files to Create

Given use case name `<UseCaseName>` (PascalCase, verb phrase):

### 1. Use case: `src/core/application/<context>/<UseCaseName>.ts`

```typescript
export class <UseCaseName> {
  constructor(
    private readonly someRepo: SomeRepository,
    // ... other ports via constructor injection
  ) {}

  async execute(params: <UseCaseName>Params): Promise<<UseCaseName>Result> {
    // Orchestration logic: call ports, use domain entities
  }
}
```

Rules:
- Single `execute()` method
- All dependencies injected via constructor (ports only)
- Can only import from `core/domain/`
- No direct I/O — always through ports
- Return typed results, never throw for expected business outcomes

### 2. Test: `src/core/application/<context>/<UseCaseName>.test.ts`

```typescript
describe("<UseCaseName>", () => {
  it("should <expected behavior>", async () => {
    // Arrange: create mocked ports
    const mockRepo: SomeRepository = {
      findById: mock(() => Promise.resolve(/* ... */)),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new <UseCaseName>(mockRepo);

    // Act
    const result = await useCase.execute(/* params */);

    // Assert: verify outputs and side effects
    expect(result).toEqual(/* expected */);
    expect(mockRepo.save).toHaveBeenCalledWith(/* expected */);
  });
});
```

Rules:
- Mock ALL ports (repos, event bus, etc.)
- Test orchestration: correct calls, correct order, correct results
- Never mock domain entities — use real ones
- Naming: `describe("ClassName")` -> `it("should <behavior>")`

### 3. Registration in `src/config/container.ts`

- Instantiate the use case, injecting port implementations
- Add to the container return type
- Pattern: adapters first -> use cases second -> event wiring last

## Context Folder

Place the use case in the most relevant context folder under `src/core/application/`:
- If the folder exists, use it
- If not, create a new one named after the business capability
- Check `PLAN.md` for the current list of contexts
