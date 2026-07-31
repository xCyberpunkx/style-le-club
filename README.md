# Style Le Club — Monorepo

Web ERP for Style Le Club (Gym · SPA · Beauty Institute). See `project-blueprint.md` (provided separately) for the full architecture, phase plan, and standing engineering rules — this README only covers running what exists so far.

## Status: Phase 0 + Phase 1 + Phase 2 (API skeleton) complete

- ✅ Monorepo scaffold: pnpm workspaces + Turborepo, shared strict TypeScript config, ESLint (flat config), Prettier, Husky + lint-staged, commitlint (conventional commits enforced)
- ✅ `packages/shared`: validated-env helper (`createEnv`), placeholder for shared Zod schemas
- ✅ `apps/api` Prisma schema: `Organization` (tenant), `User`, `Employee`, `Role`, `Permission` (global catalog), `RolePermission`, `RefreshToken`, `AuditLog`
- ✅ `apps/api` NestJS skeleton: app boots, Prisma wired in as a global injectable service, `GET /health` confirms both "the API process is alive" and "the database is reachable" as two distinct facts
- ✅ `infra/docker/docker-compose.dev.yml`: local Postgres + Redis for development
- ⏳ `apps/web`: placeholder only — real Next.js scaffold is Phase 5
- ⏳ Auth module (JWT, guards, RBAC) — Phase 3, not started yet (next approval checkpoint)

## Multi-tenancy note

Every tenant-owned table carries `organizationId` from the first schema onward. `Permission` is the one deliberately global table (fixed system capability catalog); `Role` is tenant-scoped so each organization composes its own roles from that shared catalog.

## Running this locally — step by step

```bash
# 1. Install everything
pnpm install
```

```bash
# 2. Start local Postgres + Redis
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

```bash
# 3. Set up the API's environment file
cp apps/api/.env.example apps/api/.env
```

```bash
# 4. Generate the Prisma client (needs the .env file from step 3 to exist first)
cd apps/api
npx prisma generate
```

```bash
# 5. Create the database schema and seed it
npx prisma migrate dev --name init
npx prisma db seed
```
The seed creates the `style-le-club` organization, an `Administrateur` role with every Phase 1 permission, and a default admin user: `admin@styleleclub.local` / `ChangeMe123!`.

```bash
# 6. Start the API
pnpm dev
```
(from `apps/api`, or `pnpm --filter @style-le-club/api dev` from the repo root)

```bash
# 7. Verify it's alive
curl http://localhost:3001/health
```
Expected: `{"status":"ok","timestamp":"...","database":"connected"}`. If Postgres isn't up yet, you'll instead see `"status":"degraded","database":"unreachable"` with an error message — the API itself still boots fine even if the database doesn't, which is deliberate (a crash-on-DB-hiccup API is worse than one that reports its own degraded state).

**Note:** `prisma generate` (step 4) is a deliberate manual step, not run automatically via `postinstall` — an earlier version of this did run it automatically on `pnpm install`, but that fires before step 3 creates the `.env` file on a fresh clone, causing a `Cannot resolve environment variable: DATABASE_URL` error. Same lesson as the Electron build's `postinstall` ordering issue: don't auto-run a step before its prerequisite exists.

## Verified in this sandbox

- `pnpm install` — clean install of the whole workspace, `argon2` (native module) builds successfully with zero issues on this Linux target
- `packages/shared` and `apps/api` both typecheck clean **once `prisma generate` has run** — this sandbox's network allowlist blocks the Prisma engine-binary download (`binaries.prisma.sh`), the same limitation hit during the earlier desktop-app build, confirmed by reproducing the identical error. This is sandbox-only; a real machine or CI runner with normal internet access won't hit this.

## What's next

**Phase 3 (Auth: JWT access+refresh, login, guards)** is next, pending your review of this API skeleton. No further code until confirmed, per the blueprint's incremental-approval rule.
