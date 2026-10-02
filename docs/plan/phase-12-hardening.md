# Phase 12 — Hardening

> Renumbered from Phase 11 (originally Phase 10) to make room for [Phase 9 — Live Departures](./phase-9-live-departures-fgv.md).

- [ ] Rate limiting (grammY built-in throttling)
- [ ] Logging (structured logs, differentiate local/dev/prod)
- [ ] Health check endpoint (already exists at `/health` in `main.ts` — verify it's wired into the deployment platform's monitoring)
- [x] README.md for the repository
- [ ] Circuit breaker for the live-departures provider: after N consecutive failures, skip FGV for a cooldown, then one probe call to close it. N and cooldown in public config (`liveDepartures.*`, next to `timeoutMs`). Today every search pays up to `timeoutMs` while FGV is down — see [Phase 9C](./phase-9-live-departures-fgv.md).
