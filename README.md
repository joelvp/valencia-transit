# valencia-transit

Personal project: a Telegram bot with next-departure times for Valencia's metro.

## Requirements

- **Bun `1.3.13`** — check with `bun --version`. If it doesn't match, reinstall that exact version:
  - macOS/Linux: `curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.13"`
  - Windows (PowerShell): `powershell -c "& {$(irm bun.sh/install.ps1)} -Version 1.3.13"`
  - (If you use [mise](https://mise.jdx.dev/), `.mise.toml` already pins this version for you automatically — nothing to do.)
- **[Docker](https://docs.docker.com/get-docker/)** — runs PostgreSQL locally.

## Getting started

```bash
git clone <repo-url>
cd valencia-transit

mise install                # optional, only if you use mise — installs the pinned Bun version
cp .env.example .env        # fill in BOT_TOKEN (create one via @BotFather)

docker compose up -d postgres
bun install
bun run dev
```

## Import real transit data (optional)

```bash
bun run import:gtfs        # needs NAP_USERNAME / NAP_PASSWORD in .env
```

## More commands

See `CLAUDE.md`.
