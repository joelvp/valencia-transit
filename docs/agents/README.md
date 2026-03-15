# Agent System — Developer Guide

Guide for developers working with the AI agent system in Valencia Transit.

## Overview

This project uses AI coding agents (Claude Code and OpenCode) with specialized **subagents** and **skills** to assist development following DDD + Hexagonal Architecture patterns.

```
Developer prompt
  → Main agent reads CLAUDE.md / AGENTS.md
  → Recognizes intent (domain? persistence? testing?)
  → Delegates to specialized subagent
  → Subagent uses skills as needed
  → Logs activity to agent.log
```

## Quick Reference

### Subagents

| Agent           | Specialization                                    | When to use                                         |
| --------------- | ------------------------------------------------- | --------------------------------------------------- |
| `domain-expert` | DDD patterns, aggregates, entities, VOs, events   | Any business concept — even without DDD terminology |
| `adapters`      | Primary/Secondary adapters, schema, APIs, repos   | Database, UI, Telegram handlers, REST APIs, ETL     |
| `test-engineer` | Unit/integration tests, test strategy             | Testing, verification, coverage                     |

### Skills (slash commands)

| Skill            | Type        | Description                                             |
| ---------------- | ----------- | ------------------------------------------------------- |
| `/new-aggregate` | user        | Scaffold a new domain aggregate with all files          |
| `/new-usecase`   | user        | Create a use case with co-located test                  |
| `/new-handler`   | user        | Create a primary adapter handler (Telegram/REST/CLI)    |
| `/new-migration` | user        | Guide through Drizzle schema changes                    |
| `/new-test`      | user        | Create test file for existing source                    |
| `/verify`        | user        | Full verification suite (format, typecheck, lint, test) |
| `/update-logs`   | user        | Update CHANGELOG.md and PLAN.md after a task            |
| `new-mapper`     | agent-only  | Create domain-to-persistence mapper                     |
| `new-repository` | agent-only  | Create repository implementation                        |
| `event-design`   | agent-only  | Design and wire domain events                           |
| `gtfs-import`    | agent-only  | GTFS import pipeline architecture and ETL               |

## How Delegation Works

1. You write a prompt in natural language (business or technical)
2. The main agent matches your **intent** to a subagent:
   - Real-world concepts (places, routes, timetables) → `domain-expert`
   - Interfaces/storage (tables, APIs, Telegram, DB schema) → `adapters`
   - Quality (tests, coverage, verification) → `test-engineer`
3. The main agent **asks your permission** before delegating
4. The subagent executes, using skills as needed
5. Activity is logged to `agent.log`

### Invoking agents explicitly

You can skip intent recognition and invoke directly:

```
@domain-expert create a FareZone aggregate with id, name and base price
```

### Invoking skills directly

```
/new-aggregate Vehicle
/verify
/update-logs
```

## File Structure

```
.claude/                    # Claude Code specific
├── agents/                 # Subagent definitions (frontmatter + prompt)
│   ├── adapters.md
│   ├── domain-expert.md
│   └── test-engineer.md
├── skills/                 # Skill definitions (SKILL.md per skill)
│   ├── new-aggregate/
│   ├── new-usecase/
│   ├── new-test/
│   ├── new-migration/
│   ├── new-mapper/
│   ├── event-design/
│   ├── update-logs/
│   └── verify/
├── hooks/                  # Logging scripts (TypeScript)
│   ├── echo_agent_start.ts
│   └── echo_skill_start.ts
├── rules/                  # Shared coding conventions and workflow
│   ├── code-conventions.md
│   ├── design-principles.md
│   ├── token-efficiency.md
│   └── workflow.md
├── settings.json           # Hooks config + permissions (shared)
├── settings.local.json     # Local permissions (gitignored)
└── agent.log               # Activity log (gitignored)

.opencode/                  # OpenCode specific
├── agents/                 # Adapted for OpenCode frontmatter
├── skills/                 # Clean frontmatter (name + description only)
├── plugins/                # Logging via plugin API
│   └── agent-logger.ts
├── rules/                  # Independent copy of conventions
│   └── code-conventions.md
└── agent.log               # Activity log (gitignored)

CLAUDE.md                   # Main instructions for Claude Code
AGENTS.md                   # Main instructions for OpenCode
```

## Logging

Both platforms log agent and skill activity to their respective `agent.log`:

```
[2026-03-10T21:27:07Z] 🚀 Agent: domain-expert — Create BusStop aggregate
[2026-03-10T21:27:50Z] 📚 Skill invoked: new-aggregate
[2026-03-10T21:28:34Z] 🔧 Tool: bash
```

These logs are gitignored and exist for local debugging only.

## Adding a New Skill

1. Create `.claude/skills/<name>/SKILL.md` with frontmatter (`name`, `description`, `user-invocable`)
2. Write the instructions in markdown
3. Test in Claude Code
4. Replicate to `.opencode/skills/<name>/SKILL.md` (only `name` + `description` in frontmatter)
5. Test in OpenCode

## Adding a New Agent

1. Create `.claude/agents/<name>.md` with frontmatter (`name`, `description`, `model`, `tools`, `skills`)
2. Write the agent prompt in markdown
3. Add to `SubagentStart` matcher in `.claude/settings.json`
4. Test in Claude Code
5. Replicate to `.opencode/agents/<name>.md` (adapted frontmatter: `description`, `mode`, `tools` map)
6. Test in OpenCode

## Cross-Platform Details

See [cross-platform.md](cross-platform.md) for the full comparison between Claude Code and OpenCode capabilities.
