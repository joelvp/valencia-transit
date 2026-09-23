# Phase 2 — CI/CD & Railway Deployment ✅ (historical — superseded by Phase 9)

> This phase is kept as-is for history. The project has since moved off Railway (and later Northflank) — see [phase-10-vps-coolify-migration.md](./phase-10-vps-coolify-migration.md) for the current deployment target.

Set up continuous integration with GitHub Actions and continuous deployment to Railway via Dockerfile. At this stage there's no database — CI runs lint, format check, typecheck, and unit tests. Railway deploys the app container (which just prints "Starting...").

## 2A — GitHub Actions CI

- [x] `.github/workflows/ci.yml` — runs on push + PRs to `dev` and `main`:
  - `bun install --frozen-lockfile`
  - `bun run format:check`
  - `bun run lint`
  - `bun x tsc --noEmit`
  - `bun test`
- [x] Bun version pinned to `1.3.9` in CI
- [x] Dependency caching with `actions/cache` (~15-30s faster)
- [x] `.github/dependabot.yml` — weekly auto-updates for npm + GitHub Actions
- [x] Branch protection on `dev` and `main` (require CI green to merge)

## 2B — Dockerfile & Docker Compose

- [x] `Dockerfile` — portable app container (Bun 1.3.9 pinned)
  - Works on Railway, VPS, Fly.io, any Docker host
- [x] `.dockerignore` — exclude node_modules, .env, data, etc.
- [x] `docker-compose.yml` updated with `app` service
  - `docker-compose up` starts app + postgres locally
  - App depends on postgres healthcheck

## 2C — Railway Deployment

- [x] Create Railway project with 2 environments: `staging` (branch `dev`), `production` (branch `main`)
- [x] Configure env var: `APP_ENV` (`staging` / `production`)
- [x] Verify: push to `dev` → Railway builds Dockerfile and deploys

**Pipeline**:

```text
feature/* ──PR──> dev ──PR──> main
                   │            │
              CI runs       CI runs
                   │            │
              Railway       Railway
              DEV env       PROD env
```

**Exit criteria**: PRs run CI automatically. Railway deploys from Dockerfile on merge. `docker-compose up` works locally.
