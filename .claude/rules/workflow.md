# Workflow Rules

## Intent Recognition

Users describe tasks in business language. Map intent to action before executing:

- **Real-world concept** (a place, route, timetable, vehicle...) → domain work → delegate to `domain-expert`
- **Data, storage, or interfaces** (table, migration, import, CSV, API, Telegram, handler...) → adapter work → delegate to `adapters`
- **Quality** (test, coverage, verify, check...) → testing work → delegate to `test-engineer`
- **None of the above** → work directly, no delegation needed

## After Each Task

Use `/update-logs`.

## Staleness Detection

If during work you detect that any of these files no longer reflect the actual state of the project, **stop and notify the user**:

- `CLAUDE.md` — outdated sections (new aggregates, use cases, etc.)
- Agent definitions — patterns, references to files or structures that no longer exist
- Skill definitions — steps, commands, or paths that are obsolete

**Never update these files without explicit permission.** Describe what is stale and propose the specific change.
