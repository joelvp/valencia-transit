# Model Strategy

## Main conversation — when to switch

| Task | Model | Why |
|------|-------|-----|
| Plan, design architecture, ambiguous decisions | **Opus** | Deep reasoning, trade-offs |
| Coordinate multiple agents, evaluate options | **Opus** | Broad context needed |
| Execute a skill (`/new-aggregate`, `/verify`, etc.) | **Sonnet** | Follows well-defined instructions |
| Delegate to a single agent with clear task | **Sonnet** | Agent already is Sonnet, main just routes |
| Routine coding, edit known files | **Sonnet** | No complex reasoning needed |
| Quick questions about the project | **Sonnet** | Direct lookup, no design |

**Default pattern**: Start in Sonnet → switch to Opus only for planning/ambiguity → back to Sonnet to execute.

## Agents — no changes

All 3 agents stay on `model: sonnet`. Reasons:

- **Haiku** is too limited for complex skill templates (new-aggregate, new-test)
- **Opus** on agents wastes tokens — skills already guide the work precisely
- Sonnet is the sweet spot for focused work with clear instructions
