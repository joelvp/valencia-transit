# FGV live-departure provider — endpoints & usage notes

The FGV adapters call FGV's (Ferrocarrils de la Generalitat Valenciana /
Metrovalencia) undocumented mobile-app API — it isn't a published public API, so this is
documented here in the open rather than left implicit in code.

## Structure

- `FgvApiClient` — HTTP + session handling (cookies, retry, timeout, User-Agent).
- `LiveDepartureProviderFgv` — station-id lookup + mapping to `LiveArrival`.
- `FgvStationMatcher` / `LiveStationMappingFgv` — match our stations to FGV's and persist via `FgvStationIdStore`.

## Endpoints called

All under `https://www.fgv.es/fgv/app/ca/api/v1/V`:

- `GET /horarios-prevision-3/{fgv_station_id}` — live arrivals for one station. Returns
  `previsiones[].trains[]`, each train carrying (among other fields) `seconds` until arrival,
  `destino` (headsign) and a line number. Mapped to the domain-shaped `LiveArrival` — no FGV
  field names or vocabulary cross the `LiveDepartureProvider` port boundary.
- `GET /estaciones` — full station catalogue with FGV's own numeric `estacion_id_FGV`, name, and
  coordinates. Public, no session required. Used by `LiveStationMappingFgv` (via `scripts/sync-fgv-station-ids.ts`)
  for the mapping, and by `FgvApiClient` purely to prime a session (see below).

## Session handling

FGV tightened `horarios-prevision-3` around 2026-09-21 to sometimes require session cookies
(documented by a third-party open-source client).
Any public catalogue call sets them, `/estaciones` included, so the adapter primes the session
with a plain `GET /estaciones`, reuses the cookie across calls, and on any non-OK response resets
the cookie and retries exactly once before giving up. Every request has a short timeout
(`FGV_DEFAULT_TIMEOUT_MS`), so a hung endpoint fails fast and the bot falls back to scheduled data.

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
