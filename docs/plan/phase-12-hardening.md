# Phase 12 — Hardening

> Renumbered from Phase 11 (originally Phase 10) to make room for [Phase 9 — Live Departures](./phase-9-live-departures-fgv.md).

- [ ] Rate limiting (grammY built-in throttling)
- [ ] Logging (structured logs, differentiate local/dev/prod)
- [ ] Health check endpoint (already exists at `/health` in `main.ts` — verify it's wired into the deployment platform's monitoring)
- [x] README.md for the repository
- [ ] **Resilient live departures** — design agreed on 2026-11-11 after real FGV tests showed hang rates of up to ~50% at times. Build in this order:
  1. **Circuit breaker** (global, wraps `LiveDepartureProvider` in the container): opens after repeated FGV failures, skips FGV for a cooldown, then one probe call to close it. Threshold must be **well above 5 failures** — with hedging, a short FGV hiccup alone produces several; consider a rate over a window (e.g. most of the last N lookups in 60 s) instead of a plain consecutive count. Threshold and cooldown in public config (`liveDepartures.*`).
  2. **Per-station cache / request coalescing**: lookups for the same station within a few seconds share one FGV call, so load doesn't grow with users.
  3. **Live status in the search result**: `live` (data), `noMatch` (FGV answered, no trains for this trip — not an error) or `unavailable` (FGV failed). Only `unavailable` triggers retries.
  4. **Telegram: answer first, upgrade later**. First try live within `timeoutMs` (1.5 s, hedged) as today. If `unavailable`, reply with scheduled times and a footer like `🕒 Horario previsto · ⏳ reintentando tiempo real…`, then retry in the background with growing gaps (e.g. 3 s, 9 s, 21 s, 45 s; at most 1 min). On success, edit the message with 📡 times recomputed for that moment; otherwise edit the footer to `🕒 Tiempo real no disponible ahora mismo`. While the breaker is open, skip both the 1.5 s attempt and the retries and say so straight away. `noMatch` shows the plain scheduled footer, no retries.
  5. Optional: `🔄 Actualizar` button on the departures message.
