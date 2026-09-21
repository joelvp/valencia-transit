# Phase 0 — Project Scaffold & Tooling ✅

Set up the project from scratch with all tooling, configuration, and folder structure. No business logic yet — just a compilable, lintable, testable skeleton.

- [x] Initialize Bun + TypeScript project
  - `bun init`, `tsconfig.json` with strict mode, ESNext, bundler module resolution
  - Path aliases: `@/` → `src/`
- [x] Install dependencies
  - Production: `grammy`, `drizzle-orm`, `postgres`
  - Dev: `drizzle-kit`, `eslint`, `prettier`, `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-hexagonal-architecture`, `@eslint/js`
  - Note: Downgraded ESLint to v9 for compatibility with hexagonal-architecture plugin
- [x] Configure ESLint
  - `@typescript-eslint/recommended` + strict rules
  - `eslint-plugin-hexagonal-architecture` with `enforce-boundaries` rule
  - `eslint-config-prettier` to avoid conflicts
  - Excluded `src/main.ts` and `scripts/**/*.ts` from hexagonal enforcement (entry points)
- [x] Configure Prettier (semicolons, double quotes, trailing commas, 100 chars)
- [x] Create folder structure (empty files with `index.ts` barrels where needed):

  ```text
  src/core/domain/{station,line,schedule,trip,shared,event,error}/
  src/core/application/{departure,import,station,analytics}/
  src/adapters/in/telegram/handlers/
  src/adapters/out/persistence/drizzle/mappers/
  src/adapters/out/transit-data/
  src/adapters/out/event-bus/
  src/adapters/out/notification/
  src/config/
  src/main.ts
  tests/
    component/      # use case + real adapters + real DB
    e2e/            # full flow from entry point to response
  ```

- [x] Docker Compose for local Postgres 17
  - DB: `metrovalencia`, user: `metro`, pass: `metro`, port: 5432
  - Removed obsolete `version` field
- [x] `.env.example` with all required env vars (no real values)
- [x] `.env` with real values for local development (DATABASE_URL pointing to Docker Compose Postgres, placeholders for credentials)
- [x] `.gitignore` covering: `.env`, `node_modules/`, `dist/`, `data/gtfs/`, `CLAUDE.md`, `PLAN.md`, `CHANGELOG.md`
- [x] `package.json` scripts: `dev`, `lint`, `format`, `test`, `db:generate`, `db:migrate`, `db:studio`
- [x] Smoke test: verify `tsc --noEmit`, `bun run lint`, `bun test` all pass on empty project
- [x] First commit + GitHub repo

**Exit criteria**: ✅ Project compiles, lints, and runs an empty test suite. Folder structure in place. Docker Compose starts Postgres.
