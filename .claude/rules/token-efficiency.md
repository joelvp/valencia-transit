# Token Efficiency

Mandatory rules to minimize token usage. All agents must follow these without exception.

## Before exploring

- **Check session context first**: If entity constructors, schema, or code patterns are already in the session summary — do NOT re-explore them. Use the existing context directly.
- **Read targeted files only**: Read the 1–2 specific files you need. Never glob or explore directories speculatively.
- **No web fetches**: Never use WebFetch or WebSearch. All patterns are in the codebase.

## Output format

- **Concise output**: Return bullet points and focused code snippets — never full source file dumps.
- **No duplication**: If the prompt already includes constructors, schema columns, or examples — use them directly. Do NOT re-read those files from disk.
- **Structured results**: End responses with a short summary (files created, tests passed, commands run) — not a full narrative.
- **Minimum tool calls**: If you need one file, read one file. Avoid redundant reads.
