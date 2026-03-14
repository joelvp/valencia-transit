---
name: new-handler
description: Create an agnostic primary adapter handler (Telegram, REST, CLI) following hexagonal architecture with co-located tests and DI wiring.
---

# New Handler

Create an entry point handler (Primary Adapter) and wire it in the DI container. The handler name and type are provided via `$ARGUMENTS` (e.g., `/new-handler departures --type rest`).

## Naming Convention

- Handler name: `camelCase` + `Handler` / `Controller` (e.g., `departuresHandler`, `userController`)
- Factory function: `create<Name>Handler`

## Adapter Types

Determine the type of the adapter from the arguments (`--type <type>`). Supported types typically include `telegram`, `rest`, `cli`, or others as requested by the user.

### Common Rules for all Adapters:
- **Dependency Rule:** Handlers receive use case(s) via factory function parameters — no global imports.
- **Imports:** Only import types from `core/application/` — never from `core/domain/` directly.
- **Parsing:** Parse and validate all user input at the boundary.
- **Formatting:** Format output within the handler — use cases return domain data, handlers format it for the specific UI (JSON, text, etc.).
- **Responsibility:** Keep handlers thin: parse → execute → format → reply.

## Files to Create

### 1. Handler: `src/adapters/in/<type>/handlers/<name>Handler.ts`

**For Telegram (`--type telegram`):**
```typescript
import type { Context } from "grammy";
import type { <UseCaseName> } from "@/core/application/<context>/<UseCaseName>";

export function create<Name>Handler(<useCase>: <UseCaseName>) {
  return async (ctx: Context): Promise<void> => {
    // 1. Parse input (ctx.message?.text, ctx.match, etc.)
    // 2. Call use case
    const result = await <useCase>.execute({ /* params */ });
    // 3. Format and send response
    await ctx.reply(formatResult(result));
  };
}

function formatResult(result: /* type */): string {
  return "";
}
```

**For REST APIs (`--type rest`):**
```typescript
import type { <UseCaseName> } from "@/core/application/<context>/<UseCaseName>";

export function create<Name>Handler(<useCase>: <UseCaseName>) {
  return async (req: Request): Promise<Response> => {
    // 1. Parse input (URL params, JSON body, etc.)
    // 2. Call use case
    const result = await <useCase>.execute({ /* params */ });
    // 3. Format into JSON Response
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}
```

### 2. Test: `src/adapters/in/<type>/handlers/<name>Handler.test.ts`

```typescript
import { describe, it, expect, mock } from "bun:test";
import { create<Name>Handler } from "./<name>Handler";

describe("<name>Handler", () => {
  it("should process request and reply with formatted result", async () => {
    // Arrange: mock the use case
    const mock<UseCase> = {
      execute: mock(() => Promise.resolve(/* expected result */)),
    };

    const handler = create<Name>Handler(mock<UseCase>);

    // Mock Context (e.g., grammY Context for Telegram, or standard Request for REST)
    // Act
    // Assert: verify use case was called with correct params and response is formatted properly
  });
});
```

### 3. Register command in the App Router/Bot

Register the new handler in the corresponding entry point:
- For Telegram: `src/adapters/in/telegram/bot.ts`
- For REST: `src/adapters/in/rest/server.ts` OR respective router.

Pass the use case from the container to the handler factory.

### 4. Wire in `src/adapters/container.ts`

```typescript
// Ensure the use case is instantiated and exported from the container
export function createContainer(db: DrizzleInstance) {
  // Driven adapters
  // Use cases
  const <useCase> = new <UseCaseName>(/* dependencies */);

  return { <useCase> };
}
```

## Checklist

- [ ] Adapter type determined and appropriate path used (`src/adapters/in/<type>/...`)
- [ ] Handler is a factory function, not a class
- [ ] Use case injected via factory parameter
- [ ] Input validated and output formatted directly in the handler
- [ ] Co-located test verifies logic with mocked use case and mocked context/request
- [ ] Handler wired to the corresponding router/bot
- [ ] Use case instantiated and available in `container.ts`
