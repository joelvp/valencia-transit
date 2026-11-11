# Database environments

Which database each context uses, why, and how it is wired. Decided on 2026-11-11 after the
integration tests wiped the local working data (app and tests read the same `DATABASE_URL`).

## At a glance

Two separate Postgres containers: one for the app, as in the deployed environments, and one only
for tests, as in GitHub Actions.

| Container               | Port | Database             | Used by                                                   | Data                      |
| ----------------------- | ---- | -------------------- | --------------------------------------------------------- | ------------------------- |
| `metrovalencia-db`      | 5432 | `metrovalencia`      | `bun run dev`, `import:gtfs`, `sync:fgv`, scripts, `app`  | Kept (Docker volume)      |
| `metrovalencia-test-db` | 5433 | `metrovalencia_test` | `bun test`                                                | Empty, in memory (tmpfs)  |
| CI service container    | 5432 | `metrovalencia_test` | GitHub Actions `test` job                                 | Destroyed after the job   |
| _(set in Coolify)_      | —    | _(set in Coolify)_   | Deployed app (`dev`, `prod`)                              | Untouched by tests        |

Both local containers can run at the same time.

## How it is wired

The code never hardcodes a database: everything reads `DATABASE_URL`. What changes is _which file_
provides it.

| Context           | Source of `DATABASE_URL`                   | Points to                   |
| ----------------- | ------------------------------------------ | --------------------------- |
| `bun run …`       | `.env` (private, not committed)            | `:5432/metrovalencia`       |
| `bun test`        | `.env.test` (committed, local creds only)  | `:5433/metrovalencia_test`  |
| CI                | `env:` block in `.github/workflows/ci.yml` | `:5432/metrovalencia_test`  |
| Deployed          | Coolify environment variables              | That environment's database |

- **Why `.env.test` wins under `bun test`**: `bun test` sets `NODE_ENV=test`, and Bun then loads
  `.env.test` on top of `.env`.
- **Deployed environments are not affected**: `.dockerignore` excludes `.env` and `.env.*`, so the
  image only sees Coolify's variables.

## Safety guard

`tests/setup.ts` is preloaded by `bun test` (`bunfig.toml` → `[test] preload`) and calls
`assertSafeTestDatabase(DATABASE_URL)` before any test file runs. The whole run aborts unless the
host is local **and** the database name ends in `_test`. This protects the app database if
`.env.test` is ever missing, and any remote database.

## Migrations for tests

The same preload then applies any pending migrations to the test database (`prepareTestDatabase`),
with the same Drizzle migrator the app runs at startup. Like Rails or Django, the test runner
prepares its own database: there is no separate migrate step locally or in CI, and a fresh
container is ready on the first `bun test`. Once migrated, the check costs a few milliseconds.

- **Database down**: prints a warning telling you to run `bun run test:db`, instead of leaving only
  dozens of connection errors. It warns rather than aborts, so unit tests still run without it.
- **Broken migration**: the run fails loudly — that is a code error, not a setup one.

The guard lives in a preload, not in `clearDatabase()`, because repositories also delete rows on their
own (e.g. `replaceAll`, re-imports), so guarding only the helper would not be enough.

## Usage

### App database (once, data is kept)

```bash
docker compose up -d postgres                  # container metrovalencia-db, port 5432
bun run db:migrate
bun run import:gtfs data/gtfs/<feed>.zip       # stations, lines, trips
bun run sync:fgv                               # link stations to FGV live ids
```

`.env` must point to it: `DATABASE_URL=postgres://metro:metro@localhost:5432/metrovalencia`.

### Test database (before running tests)

```bash
bun run test:db                 # starts metrovalencia-test-db (port 5433), empty
bun test                        # migrates it, then runs the tests
```

`docker compose up -d` (all services) also starts it; either way `bun test` migrates it. It keeps
its data in memory, so after it stops (or the machine restarts) it starts empty again — just start
it and run the tests. Both containers can stay up at the same time.

### Start from scratch

Deletes both containers and the app data volume, then rebuilds everything:

```bash
docker compose down -v
docker compose up -d --wait postgres
bun run db:migrate
bun run import:gtfs data/gtfs/<feed>.zip
bun run sync:fgv
bun run test:db
bun test
```

## Decisions and alternatives considered

1. **Separate test container** (chosen) — mirrors CI and the deployed setup: the app database is
   the same everywhere and tests never share a Postgres with it. In-memory storage keeps it fast
   and always empty; `bun test` migrates it, so starting it is all the setup.
2. _Two databases in one container_ (`metrovalencia_local` + `metrovalencia`, used on 2026-11-10) —
   replaced: needed an init script and names that were easy to confuse with the `local`/`dev`
   environments.
3. _Testcontainers (Postgres per test run)_ — rejected for now: full isolation and zero setup, but
   slower startup per run. Worth revisiting if parallel test runs or multiple contributors appear.
