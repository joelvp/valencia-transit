# Cross-Platform Strategy — Claude Code vs OpenCode

## Why Two Configurations?

This project supports **two AI coding tools** that share the same philosophy but differ in capabilities:

- **Claude Code** — Anthropic's official CLI tool. Reads `CLAUDE.md`.
- **OpenCode** — Open-source alternative. Reads `AGENTS.md`.

Each has its own configuration directory (`.claude/` and `.opencode/`), its own instructions file, and its own agent/skill definitions. **This is intentional, not duplication** — each platform has unique features that require adapted configuration.

## Capability Comparison

| Feature               | Claude Code                                                          | OpenCode                                                       |
| --------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Instructions file** | `CLAUDE.md`                                                          | `AGENTS.md` (auto-read from root)                              |
| **Agent location**    | `.claude/agents/`                                                    | `.opencode/agents/`                                            |
| **Agent frontmatter** | `name`, `description`, `model`, `tools` (list), `skills`             | `description`, `mode`, `tools` (map with booleans)             |
| **Skill location**    | `.claude/skills/`                                                    | `.opencode/skills/` (also reads `.claude/skills/` as fallback) |
| **Skill frontmatter** | `name`, `description`, `user-invocable`, `hooks`, `allowed-tools`    | `name`, `description` only (rest ignored)                      |
| **Hooks**             | Declarative in `settings.json` (`SubagentStart`, `PreToolUse`, etc.) | Plugin API (`tool.execute.before`)                             |
| **Logging**           | TS scripts via hooks → `.claude/agent.log`                           | Plugin → `.opencode/agent.log`                                 |
| **Permissions**       | `settings.json` → `permissions.allow`                                | `opencode.json` → `permission.bash`                            |
| **Rules**             | `.claude/rules/*.md`                                                 | `.opencode/rules/*.md`                                         |
| **Commands**          | `.claude/commands/*.md` (not yet implemented)                        | `.opencode/commands/*.md`                                      |
| **Model selection**   | Frontmatter: `model: sonnet`                                         | JSON config or inherited                                       |
| **Skill assignment**  | Frontmatter: `skills: [new-aggregate, ...]`                          | Automatic discovery                                            |

## Development Approach

```
┌─────────────────────────────────────────────┐
│  1. Design & implement in Claude Code       │
│     (.claude/ agents, skills, hooks)        │
│                                             │
│  2. Test thoroughly                         │
│     - Check agent.log for delegation        │
│     - Verify skills trigger correctly       │
│     - Confirm hooks fire                    │
│                                             │
│  3. Replicate to OpenCode                   │
│     (.opencode/ agents, skills, plugins)    │
│     - Adapt frontmatter to OpenCode format  │
│     - Remove unsupported fields             │
│     - Update plugin if new events needed    │
│                                             │
│  4. Test in OpenCode                        │
│     - Check agent.log for delegation        │
│     - Verify skills trigger correctly       │
│     - Confirm plugin captures events        │
└─────────────────────────────────────────────┘
```

## Key Differences to Watch

### 1. Skill frontmatter

Claude Code supports rich frontmatter — OpenCode only reads `name` and `description`:

**Claude Code** (`.claude/skills/new-aggregate/SKILL.md`):

```yaml
---
name: new-aggregate
description: Create a new domain aggregate
user-invocable: true
hooks:
  PreToolUse:
    - matcher: "Bash"
      command: "bun ./.claude/hooks/echo_skill_start.ts new-aggregate"
---
```

**OpenCode** (`.opencode/skills/new-aggregate/SKILL.md`):

```yaml
---
name: new-aggregate
description: Create a new domain aggregate
---
```

### 2. Agent frontmatter

**Claude Code** (`.claude/agents/domain-expert.md`):

```yaml
---
name: domain-expert
description: Specialized in DDD patterns...
model: sonnet
tools:
  - Read
  - Grep
  - Bash
skills:
  - new-aggregate
  - new-usecase
---
```

**OpenCode** (`.opencode/agents/domain-expert.md`):

```yaml
---
description: Specialized in DDD patterns...
mode: subagent
tools:
  Read: true
  Grep: true
  Bash: true
---
```

### 3. Logging mechanism

**Claude Code** uses declarative hooks:

```json
// .claude/settings.json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "domain-expert|adapters|test-engineer",
        "hooks": [{ "type": "command", "command": "bun ./.claude/hooks/echo_agent_start.ts" }]
      }
    ]
  }
}
```

**OpenCode** uses a plugin:

```typescript
// .opencode/plugins/agent-logger.ts
if (input.tool === "task") {
  const agent = _output.args?.subagent_type ?? "unknown";
  await log(worktree, "🚀", `Agent: ${agent} — ${desc}`);
}
```

### 4. Subagent invocation internals

| Aspect                   | Claude Code                  | OpenCode                        |
| ------------------------ | ---------------------------- | ------------------------------- |
| Tool name for delegation | Internal (not exposed)       | `task`                          |
| Agent identifier         | `agent_type` (in hook stdin) | `subagent_type` (in tool args)  |
| Explicit invocation      | `@domain-expert`             | `@domain-expert`                |
| Implicit delegation      | Based on agent descriptions  | Based on AGENTS.md intent rules |

## Golden Rules

1. **Never cross-reference**: `.claude/` files must not reference `.opencode/` paths and vice versa
2. **Test first in Claude**: Claude Code has richer features — validate there first
3. **Adapt, don't copy**: OpenCode requires different frontmatter — always adapt when replicating
4. **Keep logs gitignored**: Both `agent.log` files are local debugging tools
5. **Update both on changes**: When modifying shared logic (delegation rules, conventions), update both `CLAUDE.md` and `AGENTS.md`
