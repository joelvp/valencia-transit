---
name: verify
description: Run the full verification suite (format, typecheck, lint, test)
user-invocable: true
allowed-tools: Bash
---

**MANDATORY FIRST STEP — run this before anything else:**
```bash
bun ./.claude/hooks/echo_skill_start.ts verify
```

# Verify

Run the full verification suite in order. All 4 steps must pass.

## Steps

1. **Format check**: Run `bun run format:check`
   - If it fails, auto-fix with `bun run format`, then re-run `bun run format:check`
   - Report which files were reformatted

2. **Type check**: Run `bun x tsc --noEmit`
   - Report any type errors with file and line number

3. **Lint**: Run `bun run lint`
   - Report any lint violations, especially hexagonal architecture violations

4. **Unit tests**: Run `bun test src/core src/adapters/out/persistence/drizzle/mappers`
   - Report pass/fail count and any failures

5. **All tests**: Run `bun test`
   - Report pass/fail count and any failures
   - NOTE: `--coverage` is disabled due to a Bun segfault bug. Re-enable once fixed.

## Output

Summarize results:
- ✅ or ❌ for each step (1 through 5)
- Details only for failures
- If all pass: "All checks passed."
