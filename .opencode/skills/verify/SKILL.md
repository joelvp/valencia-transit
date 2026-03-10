---
name: verify
description: Run the full verification suite (format, typecheck, lint, test)
---

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

4. **Tests**: Run `bun test`
   - Report pass/fail count and any failures

## Output

Summarize results:

- ✅ or ❌ for each step
- Details only for failures
- If all pass: "All checks passed."
