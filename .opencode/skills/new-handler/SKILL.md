---
name: new-handler
description: Create a Telegram command handler following the project pattern with co-located test and DI wiring
user-invocable: true
---

# New Handler

Create a Telegram command handler and wire it in the DI container. The handler name is provided via `$ARGUMENTS` (e.g., `/new-handler departures`).

## Naming Convention

- Handler name: `camelCase` + `Handler` — e.g., `departuresHandler`, `helpHandler`
- Factory function: `create<Name>Handler` — e.g., `createDeparturesHandler`
- Command: lowercase — e.g., `/departures`, `/help`

## Files to Create

### 1. Handler: `src/adapters/in/telegram/handlers/<name>Handler.ts`

```typescript
import type { Context } from "grammy";
import type { <UseCaseName> } from "@/core/application/<context>/<UseCaseName>";

export function create<Name>Handler(<useCase>: <UseCaseName>) {
  return async (ctx: Context): Promise<void> => {
    // 1. Parse input from ctx (ctx.message?.text, ctx.match, etc.)
    // 2. Call use case
    const result = await <useCase>.execute({ /* params */ });
    // 3. Format and send response
    await ctx.reply(formatResult(result));
  };
}

function formatResult(result: /* type */): string {
  // Format domain result as human-readable Telegram message
  return "";
}
```

Rules:
- Handler receives use case(s) via factory function parameters — no global imports
- Only import types from `core/application/` — never from `core/domain/` directly
- Parse and validate all user input here (this is the system boundary)
- Format output here — use cases return domain data, handlers format it for Telegram
- Keep handlers thin: parse → execute → format → reply

### 2. Test: `src/adapters/in/telegram/handlers/<name>Handler.test.ts`

```typescript
import { describe, it, expect, mock } from "bun:test";
import { create<Name>Handler } from "./<name>Handler";

describe("<name>Handler", () => {
  it("should reply with formatted result", async () => {
    // Arrange: mock the use case
    const mock<UseCase> = {
      execute: mock(() => Promise.resolve(/* expected result */)),
    };

    const handler = create<Name>Handler(mock<UseCase>);

    // Mock grammY Context
    const mockCtx = {
      reply: mock(() => Promise.resolve()),
      message: { text: "/command input" },
    } as unknown as Context; // cast — only mock what the handler uses

    // Act
    await handler(mockCtx);

    // Assert
    expect(mock<UseCase>.execute).toHaveBeenCalledWith(/* expected params */);
    expect(mockCtx.reply).toHaveBeenCalledWith(/* expected message */);
  });

  it("should handle missing input gracefully", async () => {
    // Test edge cases: empty input, invalid format, etc.
  });
});
```

### 3. Register command in `src/adapters/in/telegram/bot.ts`

```typescript
import { Bot } from "grammy";
import { create<Name>Handler } from "./handlers/<name>Handler";

export function createBot(token: string, container: AppContainer) {
  const bot = new Bot(token);

  bot.command("<command>", create<Name>Handler(container.<useCase>));
  // ... other commands

  return bot;
}
```

If `bot.ts` does not exist yet, create it following this pattern.

### 4. Wire in `src/adapters/container.ts`

```typescript
// Ensure the use case is instantiated and exported from the container
export function createContainer(db: DrizzleInstance) {
  // 1. Driven adapters
  const <aggregate>Repo = new <Aggregate>RepositoryDrizzle(db);

  // 2. Use cases
  const <useCase> = new <UseCaseName>(<aggregate>Repo);

  return { <useCase> };
}

export type AppContainer = ReturnType<typeof createContainer>;
```

If `container.ts` does not exist yet, create it following the pattern above.

## Checklist

- [ ] Handler is a factory function, not a class
- [ ] Use case injected via factory parameter, not imported globally
- [ ] All user input parsed and validated in the handler
- [ ] Output formatted in the handler (not in the use case)
- [ ] Co-located test mocks the use case and grammY Context
- [ ] Command registered in `bot.ts`
- [ ] Use case wired in `container.ts`
