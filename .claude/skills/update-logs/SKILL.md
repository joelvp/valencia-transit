---
name: update-logs
description: Update CHANGELOG.md and PLAN.md after completing a task. Appends to CHANGELOG.md without reading.
user-invocable: true
---

**MANDATORY FIRST STEP — run this before anything else:**
```bash
bun ./.claude/hooks/echo_skill_start.ts update-logs
```

# Update Logs

This is the mandatory post-task step. Uses `/update-logs` after completing any task.

## Steps

### 1. CHANGELOG.md (append only - NEVER read first)

Use Bash tool with append mode to add entry at the end:

```bash
echo "
---
## YYYY-MM-DD — <Task title>

**Goal**: <Brief description>

**Completed**:
- ✅ <Item 1>
- ✅ <Item 2>

**Next Steps**: <What comes next>
" >> CHANGELOG.md
```

**Rules:**
- Use today's date (check with `date` command if unsure)
- Entries in English
- Be concise but specific
- Mark deviations with ⚠️

### 2. PLAN.md (only if applicable)

Only read PLAN.md if the task was explicitly about completing items from it. If so:
- Find items completed in this task
- Mark them with `[x]`
- Adjust text if reality differed

**Important**: If no PLAN.md items apply, skip reading PLAN.md entirely.

## Example

```
## YYYY-MM-DD — Add BusStop entity

**Goal**: Add BusStop aggregate with repository and mapper

**Completed**:
- ✅ BusStop entity with factory method
- ✅ BusStopId, BusStopName, BusStopLocation VOs
- ✅ BusStopRepository port interface
- ✅ BusStopMapper Drizzle
- ✅ BusStopRepositoryDrizzle implementation
- ✅ Unit tests (12 tests)

**Next Steps**: Add use cases for bus stop queries
```
