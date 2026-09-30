# Phase 11 — Automatic GTFS Download & Version Detection

> Renumbered from Phase 10 (originally Phase 9) to make room for [Phase 9 — Live Departures](./phase-9-live-departures-fgv.md), reprioritized ahead of this. Postponed until [Phase 10 — VPS + Coolify Migration](./phase-10-vps-coolify-migration.md) is done — getting the bot running live again takes priority over this.

Automate the full data pipeline: detect new GTFS versions, download, import, notify.

## 11A — NAP Client

- [ ] `NapClient.ts` — HTTP client for NAP portal:
  - `login(username, password)` — POST to login endpoint, get session cookie
  - `downloadZip(sessionCookie)` — GET download endpoint, save to disk
- [ ] Tests with mocked HTTP

## 11B — Version Checker

- [ ] `GtfsVersionChecker.ts` — fetch public NAP page, extract metadata (publication date, validity, file size)
- [ ] `DatasetVersionRepository` — port interface in `core/domain/shared/`: `findLatest()`, `save(version)`
- [ ] `DatasetVersionRepositoryDrizzle.ts` — implements `DatasetVersionRepository` port, persists to `dataset_versions`
- [ ] `CheckDatasetVersion.ts` use case — compare metadata with `DatasetVersionRepository`, trigger import if new
- [ ] **Anomaly detection** — before committing import, compare incoming counts against current DB (stations, lines, schedules). If any drops below a threshold (e.g. <50% of current), abort and notify admin instead of replacing good data with a truncated dataset.

## 11C — Cron Job

- [ ] `config/cron.ts` — daily job (overnight) that runs `CheckDatasetVersion`
- [ ] Full automated flow: detect → download → import → sync FGV station ids → notify admin
- [ ] Run the `SyncLiveStationMapping` use case (same wiring as `scripts/sync-fgv-station-ids.ts`) as an independent step after each import: if FGV fails, notify admin and keep the previous mapping (no FK to `stations`, so imports never wipe it; `saveAll` is transactional)
- [ ] Also run the FGV station-id sync on its own schedule (e.g. weekly) even without a new GTFS, to catch FGV-side changes (new stations, renumbered ids)
- [ ] Single source for the Metrovalencia feed id: `import-gtfs.ts` derives it from the zip name and `container.ts` hardcodes `"metrovalencia"` for the FGV sync — unify in one constant/public config so they can't drift (a mismatch would silently break live departures)
- [ ] `TelegramNotifier.ts` — notify admin of success/failure via Telegram

**Exit criteria**: System automatically detects new GTFS versions, downloads, imports, and notifies admin. Manual intervention only needed if something fails.
