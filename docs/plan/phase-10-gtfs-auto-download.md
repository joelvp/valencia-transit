# Phase 10 — Automatic GTFS Download & Version Detection

> Renumbered from the original Phase 9. Postponed until [Phase 9 — VPS + Coolify Migration](./phase-9-vps-coolify-migration.md) is done — getting the bot running live again takes priority over this.

Automate the full data pipeline: detect new GTFS versions, download, import, notify.

## 10A — NAP Client

- [ ] `NapClient.ts` — HTTP client for NAP portal:
  - `login(username, password)` — POST to login endpoint, get session cookie
  - `downloadZip(sessionCookie)` — GET download endpoint, save to disk
- [ ] Tests with mocked HTTP

## 10B — Version Checker

- [ ] `GtfsVersionChecker.ts` — fetch public NAP page, extract metadata (publication date, validity, file size)
- [ ] `DatasetVersionRepository` — port interface in `core/domain/shared/`: `findLatest()`, `save(version)`
- [ ] `DatasetVersionRepositoryDrizzle.ts` — implements `DatasetVersionRepository` port, persists to `dataset_versions`
- [ ] `CheckDatasetVersion.ts` use case — compare metadata with `DatasetVersionRepository`, trigger import if new
- [ ] **Anomaly detection** — before committing import, compare incoming counts against current DB (stations, lines, schedules). If any drops below a threshold (e.g. <50% of current), abort and notify admin instead of replacing good data with a truncated dataset.

## 10C — Cron Job

- [ ] `config/cron.ts` — daily job (overnight) that runs `CheckDatasetVersion`
- [ ] Full automated flow: detect → download → import → notify admin
- [ ] `TelegramNotifier.ts` — notify admin of success/failure via Telegram

**Exit criteria**: System automatically detects new GTFS versions, downloads, imports, and notifies admin. Manual intervention only needed if something fails.
