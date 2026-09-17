# Phase 9 — Migrate Deployment: Northflank → Hetzner VPS + Coolify

The project outgrew Railway (Phase 2) and later moved to Northflank, but free/cheap managed platforms have been too slow and limited. This phase moves deployment to a self-managed Hetzner VPS running Coolify, reusing the existing `Dockerfile`/`docker-compose.yml` instead of platform-specific config. This takes priority over Phase 10 (automatic GTFS download) — the goal right now is simply getting the bot running live again.

## 9A — Provision the VPS

- [ ] Create a Hetzner Cloud VPS (CX22 or similar — 2 vCPU / 4GB is plenty for the bot + Postgres)
- [ ] Pick the region closest to you (Falkenstein/Nuremberg for lowest latency from Spain)
- [ ] Install Coolify on the VPS (`curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`)

## 9B — Connect the repo and configure the resource

- [ ] Connect GitHub to Coolify (so it can pull `valencia-transit`)
- [ ] Create the resource as **Docker Compose** type, pointing at the existing `docker-compose.yml` (`app` + `postgres` services) — avoids standing up a separate managed database
- [ ] Set the real environment variables in Coolify's dashboard: `BOT_TOKEN`, `DATABASE_URL`, `NAP_USERNAME`, `NAP_PASSWORD`, `ADMIN_CHAT_ID`, `APP_ENV`
- [ ] First deploy: verify the container builds and the `/health` endpoint responds

## 9C — Automate deploys

- [ ] Grab the auto-deploy webhook URL from Coolify
- [ ] Register the webhook on the GitHub repo (or call it from a workflow step)
- [ ] Rewrite `.github/workflows/cd.yml` — replace the Northflank `curl` step with a call to the Coolify webhook
- [ ] Verify: push to `dev`/`main` triggers an automatic redeploy

## 9D — Cut over and clean up

- [ ] Confirm the bot responds live from the new VPS (real Telegram message round-trip)
- [ ] Import real GTFS data on the new instance (`bun run import:gtfs`, or restore a DB dump)
- [ ] Decommission the Northflank services (`prod-metrovalencia-bot`, `dev-metrovalencia-bot`)
- [ ] Remove `NORTHFLANK_API_KEY` secret from the GitHub repo settings
- [ ] Update `CLAUDE.md` / `.env.example` comments that still reference Northflank

**Exit criteria**: Bot is live and responding from the Hetzner VPS via Coolify. Pushing to `dev`/`main` redeploys automatically. Northflank is fully decommissioned.
