# AGENTS.md — Valencia Transit

Guidelines for agents on the valencia-transit codebase.
Conventions (naming, formatting, layer rules, testing) in `.opencode/rules/code-conventions.md`.

---

## Project Overview

Transit information system for Valencia's metro. Tells users next departures with line, time, and minutes remaining. Telegram bot first, designed for multi-transport, multi-interface growth.

**Stack**: TypeScript (strict) + Bun · PostgreSQL · Drizzle ORM · grammY · Railway
**Architecture**: Hexagonal + DDD

---

## Agent Delegation

IMPORTANT: Match user **intent**, not just technical keywords. Users often describe tasks in business language rather than DDD terminology. Before acting, ask yourself: **"What domain concept is the user referring to, and what technical work does it require?"**

- If the user mentions a **real-world concept** (a place, a route, a timetable, a vehicle...), they are likely talking about a domain aggregate or entity — delegate to `domain-expert`.
- If the user mentions **data storage, imports, or schema**, delegate to `persistence`.
- If the user mentions **testing or verification**, delegate to `test-engineer`.

| User intent                                                                                        | Delegate to     |
| -------------------------------------------------------------------------------------------------- | --------------- |
| Create, modify, or query any **business concept** — even if they never say "aggregate" or "entity" | `domain-expert` |
| Database schema, migrations, Drizzle queries, mappers, data import, ETL                            | `persistence`   |
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

## Skills

Skills live in `.opencode/skills/` and are shared across agents and the main agent.

| Skill            | Invoke | Description                                             |
| ---------------- | ------ | ------------------------------------------------------- |
| `/verify`        | User   | Full verification suite (format, typecheck, lint, test) |
| `/update-logs`   | User   | Update CHANGELOG.md and PLAN.md                         |
| `/new-aggregate` | User   | Scaffold a new domain aggregate                         |
| `/new-usecase`   | User   | Create use case with co-located test                    |
| `/new-migration` | User   | Guide through Drizzle schema changes                    |
| `/new-test`      | User   | Create test file for existing source                    |
| `new-mapper`     | Agent  | Create domain-to-persistence mapper                     |
| `event-design`   | Agent  | Design and wire domain events                           |

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

**Full verification**: `bun run format:check && bun x tsc --noEmit && bun run lint && bun test`

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

---

## Workflow

### Intent recognition

Users describe tasks in business language. Map intent to action before executing:

- **Real-world concept** (a place, route, timetable, vehicle...) → domain work → delegate to `domain-expert`
- **Data or storage** (table, migration, import, CSV...) → persistence work → delegate to `persistence`
- **Quality** (test, coverage, verify, check...) → testing work → delegate to `test-engineer`
- **None of the above** → work directly, no delegation needed

### After each task

Use `/update-logs`.

### Staleness detection

If during work you detect that any of these files no longer reflect the actual state of the project, **stop and notify the user**:

- `CLAUDE.md` / `AGENTS.md` — outdated sections (new aggregates, use cases, commands, etc.)
- Agent definitions — patterns, references to files or structures that no longer exist
- Skill definitions — steps, commands, or paths that are obsolete

**Never update these files without explicit permission.** Describe what is stale and propose the specific change.

---

## Design Principles

1. Domain models business, not data formats — GTFS is an import adapter
2. Rich entities, lean orchestration — entities own behavior
3. Value Objects everywhere — typed, validated, no primitives
4. Events for side effects — analytics, notifications via domain events
5. Dependency inversion — domain defines ports, adapters implement
6. Co-located tests — tests live next to the code they test
7. Idempotent imports — truncate and re-insert
8. Fail-safe — if something fails, notify admin, bot keeps running
9. No over-engineering — start simple, evolve when needed
10. Scalable by design — new transport modes = new aggregates/adapters
