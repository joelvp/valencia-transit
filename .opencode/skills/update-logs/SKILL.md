---
name: update-logs
description: Update CHANGELOG.md and PLAN.md after completing a task. Appends to CHANGELOG.md without reading.
---

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

### 2. docs/plan/phase-N-*.md (only if applicable)

Roadmap checklists live in `docs/plan/`, one file per phase — `PLAN.md` is just a short index linking to them. Only read a phase file if the task was explicitly about completing items from it:

- Use `PLAN.md`'s phase table to find the right file — don't read the whole index either if you already know the phase
- Find items completed in this task
- Mark them with `[x]`
- Adjust text if reality differed

**Important**: If no phase items apply, skip reading `PLAN.md`/`docs/plan/` entirely.

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
