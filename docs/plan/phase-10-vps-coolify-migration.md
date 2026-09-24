# Phase 10 — Migrate Deployment: Northflank → Hetzner VPS + Coolify

> Renumbered from Phase 9 — [Phase 9 (Live Departures)](./phase-9-live-departures-fgv.md) was reprioritized ahead of this: no point deploying a service that isn't ready yet, refine live/static departures first.

The project outgrew Railway (Phase 2) and later moved to Northflank, but free/cheap managed platforms have been too slow and limited. This phase moves deployment to a self-managed Hetzner VPS running Coolify, reusing the existing `Dockerfile`/`docker-compose.yml` instead of platform-specific config.

## 10A — Provision the VPS

- [ ] Create a Hetzner Cloud VPS (CX22 or similar — 2 vCPU / 4GB is plenty for the bot + Postgres)
- [ ] Pick the region closest to you (Falkenstein/Nuremberg for lowest latency from Spain)
- [ ] Install Coolify on the VPS (`curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`)

## 10B — Connect the repo and configure the resource

- [ ] Connect GitHub to Coolify (so it can pull `valencia-transit`)
- [ ] Create the resource as **Docker Compose** type, pointing at the existing `docker-compose.yml` (`app` + `postgres` services) — avoids standing up a separate managed database
- [ ] Set the real environment variables in Coolify's dashboard: `BOT_TOKEN`, `DATABASE_URL`, `NAP_USERNAME`, `NAP_PASSWORD`, `ADMIN_CHAT_ID`, `APP_ENV`
- [ ] First deploy: verify the container builds and the `/health` endpoint responds

## 10C — Automate deploys

- [x] Rewrite `.github/workflows/cd.yml` — replaced the Northflank `curl` step with a call to Coolify's `POST /api/v1/deploy` API. Guarded with a placeholder check: if the secrets below aren't set, it logs a warning and exits cleanly instead of failing the run.
- [ ] Once the Coolify resource exists, create a **deploy-scoped API token** (Coolify → Keys & Tokens) and grab the resource's UUID (Coolify → your app → General)
- [ ] Add these as GitHub repo secrets (Settings → Secrets and variables → Actions):
  - `COOLIFY_URL` — base URL of your Coolify instance
  - `COOLIFY_TOKEN` — the deploy-scoped API token
  - `COOLIFY_PROD_RESOURCE_UUID` — resource UUID for the `main`-branch app
  - `COOLIFY_DEV_RESOURCE_UUID` — resource UUID for the `dev`-branch app
- [ ] Verify: push to `dev`/`main` triggers an automatic redeploy (the CD run should stop showing the "secrets not configured" warning)

## 10D — Cut over and clean up

- [ ] Confirm the bot responds live from the new VPS (real Telegram message round-trip)
- [ ] Import real GTFS data on the new instance (`bun run import:gtfs`, or restore a DB dump)
- [ ] Decommission the Northflank services (`prod-metrovalencia-bot`, `dev-metrovalencia-bot`)
- [ ] Remove `NORTHFLANK_API_KEY` secret from the GitHub repo settings
- [ ] Update `CLAUDE.md` / `.env.example` comments that still reference Northflank

**Exit criteria**: Bot is live and responding from the Hetzner VPS via Coolify. Pushing to `dev`/`main` redeploys automatically. Northflank is fully decommissioned.
