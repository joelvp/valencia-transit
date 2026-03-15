# AGENTS.md — Valencia Transit

Guidelines for agents on the valencia-transit codebase.
Conventions: @.opencode/rules/code-conventions.md
Design principles: @.opencode/rules/design-principles.md
Workflow: @.opencode/rules/workflow.md

---

## Project Overview

Transit information system for Valencia's metro. Tells users next departures with line, time, and minutes remaining. Telegram bot first, designed for multi-transport, multi-interface growth.

**Stack**: TypeScript (strict) + Bun · PostgreSQL · Drizzle ORM · grammY · Railway
**Architecture**: Hexagonal + DDD

---

## Agent Delegation

IMPORTANT: Match user **intent**, not just technical keywords. Users often describe tasks in business language rather than DDD terminology. Before acting, ask yourself: **"What domain concept is the user referring to, and what technical work does it require?"**

- If the user mentions a **real-world concept** (a place, a route, a timetable, a vehicle...), they are likely talking about a domain aggregate or entity — delegate to `domain-expert`.
- If the user mentions **data storage, interfaces, APIs, or schema**, delegate to `adapters`.
- If the user mentions **testing or verification**, delegate to `test-engineer`.

| User intent                                                                                        | Delegate to     |
| -------------------------------------------------------------------------------------------------- | --------------- |
| Create, modify, or query any **business concept** — even if they never say "aggregate" or "entity" | `domain-expert` |
| UI, Telegram commands, REST APIs, DI wiring, database schema, migrations, mappers, ETL             | `adapters`      |
| Write/fix tests, test coverage, test strategy, mocking, DB test setup                              | `test-engineer` |

Agent definitions: `.opencode/agents/`

### No subagent

If the task does not match any subagent, work directly. Do not ask for permission, just execute.

### One subagent

If the task matches a subagent, **ask the user for permission before delegating**. State:

- Which subagent you want to use
- What you will ask it to do

Delegate to the corresponding subagent only after receiving confirmation.

### Multiple subagents

If the task requires more than one subagent, **present an execution plan to the user**:

1. Which subagents will be used
2. In what order (sequential or parallel)
3. What each one will do

Execute only after full plan approval.

---

## Build Commands

```
bun run dev            # Dev mode
bun run format:check   # Prettier check (must pass before commit)
bun run format         # Prettier auto-fix
bun x tsc --noEmit     # TypeScript check
bun run lint           # ESLint (includes hexagonal architecture rules)
bun test               # All tests
bun test <file>        # Single test file
bun run db:generate    # Generate Drizzle migrations
bun run db:migrate     # Apply migrations
bun run import:gtfs    # GTFS import pipeline
```

---

## Dependency Rules (Enforced by ESLint)

```
core/domain/       → NOTHING (pure, no external imports)
core/application/  → core/domain/ only
adapters/          → core/ + config/
config/            → own utilities + external libs
main.ts            → everything
```

Need to import from `adapters/` in `core/`? **Create a port interface in domain.**

---

## Git Strategy

- **Branches**: `main` (prod) ← `dev` (staging) ← `feature/*`
- **Commits**: Conventional Commits — `<type>(<scope>): <description>`
- **Not in repo**: `CHANGELOG.md`, `.env`, `data/gtfs/`
