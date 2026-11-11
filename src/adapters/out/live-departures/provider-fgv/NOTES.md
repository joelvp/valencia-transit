# FGV live-departure provider — endpoints & usage notes

The FGV adapters call FGV's (Ferrocarrils de la Generalitat Valenciana /
Metrovalencia) undocumented mobile-app API — it isn't a published public API, so this is
documented here in the open rather than left implicit in code.

## Structure

- `FgvApiClient` — HTTP + session handling (cookies, retry, deadline, User-Agent).
- `hedgedFetch` — `fetch` decorator that resends unanswered requests (see "Hedged requests").
- `LiveDepartureProviderFgv` — station-id lookup + mapping to `LiveArrival`.
- `FgvLiveStationCatalog` — translates FGV's station list into domain `LiveStation`s (matching lives in the domain).

## Endpoints called

All under `https://www.fgv.es/fgv/app/ca/api/v1/V`:

- `GET /horarios-prevision-3/{fgv_station_id}` — live arrivals for one station. Returns
  `previsiones[].trains[]`, each train carrying (among other fields) `seconds` until arrival,
  `destino` (headsign) and a line number. Mapped to the domain-shaped `LiveArrival` — no FGV
  field names or vocabulary cross the `LiveDepartureProvider` port boundary.
- `GET /estaciones` — full station catalogue with FGV's own numeric `estacion_id_FGV`, name, and
  coordinates. Public, no session required. Used by `FgvLiveStationCatalog` (via `scripts/sync-fgv-station-ids.ts`)
  for the mapping, and by `FgvApiClient` purely to prime a session (see below).

## Session handling

FGV tightened `horarios-prevision-3` around 2026-09-21 to sometimes require session cookies
(documented by a third-party open-source client).
Any public catalogue call sets them, `/estaciones` included, so the adapter primes the session
with a plain `GET /estaciones`, reuses the cookie across calls, and on any non-OK response resets
the cookie and retries exactly once before giving up. One deadline covers every request of a call
(`liveDepartures.timeoutMs` for the bot), so a hung endpoint fails fast and the bot falls back to
scheduled data.

## Hedged requests

FGV is bimodal: a request either answers in 300–500 ms or hangs and never answers. Measured on
2026-11-10 (same headers, cookie and User-Agent as the bot, 1500 ms budget, 100 queries per
strategy, interleaved so all saw the same conditions):

| Strategy                             | Failed | p50    | p95    | Requests per query |
| ------------------------------------ | ------ | ------ | ------ | ------------------ |
| Single request (before)              | 10–12% | 350 ms | 550 ms | 1.00               |
| Hedge after 600 ms (now)             | 0%     | 350 ms | 975 ms | 1.10               |
| Fresh TCP/TLS connection per request | 3–10%  | 410 ms | 665 ms | 1.00               |

A longer timeout does not help (a hung request never answers), and a fresh connection is slower
without fixing it. So the container wraps the bot's `fetch` in `hedgedFetch`: if a request has no
answer after `liveDepartures.hedgeAfterMs` (600 ms — above FGV's normal p95), it sends the
same request once more and keeps whichever answers first, aborting the other. Both attempts share
the caller's deadline, so the worst-case wait is unchanged. A request that fails outright also waits
for the 600 ms resend — we have only seen hangs, so that case isn't worth extra code.

Load on FGV: at most 2 attempts per request, and in practice ~1 extra request
every 10 queries. The station-catalogue client (sync script) gets a plain `fetch` and does not hedge.

Session warm-up: `main.ts` calls `container.warmUpLiveDepartures()` at startup (not awaited, failure
only logged), which primes the FGV session via `FgvApiClient.primeSession()`. It lives in the
container, not the `LiveDepartureProvider` port, because it is an FGV detail. Without it, the first
lookup after a start makes two sequential requests (`/estaciones` + `horarios-prevision-3`) inside
one `timeoutMs` budget — if both hang, there's no time left for both hedges.

Not a substitute for a circuit breaker: if FGV is fully down, every lookup still waits
`timeoutMs` (Phase 12).

## Known limitations

- No real GPS: `latitude`/`longitude` on trains are always `null`.
- `capacity` is a static per-vehicle nominal value (rolling-stock capacity), not live occupancy —
  never surfaced past this adapter.
- Terminal stations never show trains "toward themselves" in their own live board.
- It's a hybrid system: matches GTFS-static almost to the second most of the time, but real
  deviations do get reflected (and propagate consistently to that vehicle's future stations).

## Legal reasoning for calling an undocumented endpoint

- FGV is a public body (Generalitat Valenciana); this is transit information of clear public
  interest. Reuse of public-sector information is favoured by the EU PSI Directive
  (2003/98/EC, amended 2013/37/EU), transposed in Spain by Ley 37/2007, and the EU ITS Directive
  (2010/40/EU) specifically pushes for open travel data via National Access Points.
- No authentication is bypassed and no access control is circumvented (Código Penal art. 197 bis
  requires exactly that to apply) — every endpoint called here answers anonymous, unauthenticated
  requests, same as any visitor's browser or the official app.
- Endpoints touching personal or financial data (`tarjetas*`, `usuarios/*`, `mensajes/*`,
  purchase/account flows) are out of scope and are never called by this adapter.
- Mitigations we commit to, mirroring how we'd want a third party to treat our own service: an
  honest `User-Agent` naming the bot (`FGV_USER_AGENT` in `FgvApiClient.ts` — never
  impersonating the official app), conservative polling (throttled by config, no tighter than the
  bot actually needs), and isolating this FGV-specific client entirely behind the
  `LiveDepartureProvider` port so it can be swapped out or disabled without touching the rest of
  the app if FGV ever objects.
