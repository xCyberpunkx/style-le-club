# Style Le Club — Master Project Blueprint

This document is the single source of truth for the project going forward. Any future conversation about this project should start from here. Supersedes ad-hoc decisions made in prior conversations except where explicitly restated below.

**Confirmed decisions this blueprint assumes:**
- Web application (not Electron desktop)
- Fully remote VPS — backend + database run on the VPS, staff connect via browser, internet dependency accepted as a deliberate tradeoff
- Stack: Next.js, NestJS, PostgreSQL, Prisma, Redis/BullMQ, Docker Compose, Nginx
- Monorepo: pnpm workspaces + Turborepo
- First module: **Auth + RBAC + Employee/Role foundation** (awaiting your go-ahead to start actual code)

---

## 1. Project initialization

**Repository setup**
- Single private GitHub repository containing the whole monorepo (frontend, backend, shared package, infra).
- `main` branch protected: no direct pushes, requires passing CI.

**Monorepo configuration (pnpm + Turborepo)**
- `pnpm-workspace.yaml` declares `apps/*` and `packages/*`.
- `turbo.json` defines the task graph (`build`, `lint`, `typecheck`, `test`) so Turborepo can cache and parallelize across `apps/web`, `apps/api`, and `packages/shared`.
- Root-level scripts (`pnpm dev`, `pnpm build`, `pnpm lint`) fan out to every workspace via Turborepo.

**Environment configuration**
- `.env.example` committed per app; real `.env` / `.env.local` files gitignored.
- A validated env schema (Zod, in `packages/shared`) parsed at boot in both `apps/api` and `apps/web` — the app should refuse to start with a clear error if a required env var is missing or malformed, rather than failing confusingly at first use three hours into a shift.

**Development tools**
- TypeScript strict mode across every package, no exceptions.
- ESLint + Prettier, one shared root config extended by each app (not reinvented per app).
- Husky + lint-staged: run lint/format on staged files at commit time.
- Conventional commit messages, enforced via commitlint — pays for itself the first time you need to find "which commit added the receipt numbering logic."

**Coding standards**
- One NestJS module = one business capability (vertical slice), never a horizontal "all controllers here" split.
- DTOs and form validation both derive from the same Zod schema in `packages/shared` — never hand-duplicate a shape in two places.
- No `any` without an inline comment explaining why it's unavoidable.
- Every list/table endpoint supports pagination from the day it's created, even when the table has ten rows.

**Git workflow & branch strategy**
- Trunk-based, short-lived feature branches: `feature/<module>-<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`.
- Even solo, open a PR against `main` for every feature — not for review by someone else necessarily, but as a forced self-review checkpoint and a permanent record of what changed and why, which matters enormously once this project spans many months.
- `main` is always deployable. Production deploys happen from tagged releases (`v0.1.0`, `v0.2.0`, ...) rather than every commit to `main` — gives you a clean rollback point and a clear changelog.

---

## 2. Architecture implementation order

Build order matters — each phase below exists specifically because the next one depends on it. Skipping ahead means building on a foundation that isn't there yet.

| # | Phase | Why now | Depends on | Test before moving on |
|---|---|---|---|---|
| 0 | Monorepo scaffold, tooling, env validation | Nothing else can start without a working dev environment | — | `pnpm dev` boots cleanly, lint/typecheck pass on an empty scaffold |
| 1 | Prisma schema foundation (User, Employee, Role, Permission) + Docker Compose local dev (Postgres, Redis) | Backend code needs a real database to connect to | Phase 0 | Migration runs clean, `docker compose up` brings up Postgres+Redis locally |
| 2 | NestJS API skeleton (app module, config module, Prisma service, health-check endpoint) | Prove the API boots and talks to the DB before any business logic exists | Phase 1 | `GET /health` returns 200 and confirms DB connectivity |
| 3 | Auth module (JWT access+refresh, login, guards) | Every other module needs to know who's calling and what they're allowed to do | Phase 2 | Login issues valid tokens; protected route rejects unauthenticated/unauthorized requests correctly |
| 4 | Employees, Roles, Permissions CRUD | Every other module's audit trail references "which employee did this" | Phase 3 | An Admin can create an Employee, assign a Role, and that Role's Permissions correctly gate a test route |
| 5 | Next.js frontend skeleton + auth pages + typed API client with auto-refresh | First end-to-end vertical slice proving frontend ↔ backend auth actually works | Phase 3, 4 | Log in through the browser, hit a protected page, get redirected correctly when unauthorized |
| 6 | Members (Clients) module | First real business entity — everything downstream references a Client | Phase 4, 5 | Full CRUD works through the UI, search/pagination work |
| 7 | Memberships: Plans, Subscriptions | Depends on Members existing | Phase 6 | Subscribe a client, confirm overlapping-subscription status logic (from the original desktop build) still holds |
| 8 | Payments | Depends on Subscriptions existing as a payment source | Phase 7 | Record a payment, confirm receipt numbering is atomic under the DB transaction |
| 9 | Attendance + access-control abstraction (mocked) | Depends on Members existing; hardware integration point lives here | Phase 6 | Manual check-in works; the mock adapter is swappable without touching the rest of the module |
| 10 | Appointments + SPA/Beauty services | Depends on Members + Employees (coaches/therapists) | Phase 6, 4 | Book an appointment, confirm no double-booking for the same employee/time slot |
| 11 | POS + Inventory | Depends on Members (optional) + Payments | Phase 8 | A sale correctly decrements stock and creates a linked Payment |
| 12 | Reports & Analytics | Aggregates data from every module above — genuinely last | Phase 6-11 | Numbers on a report match a manual count from the underlying tables |
| 13 | Notifications (WebSocket-based) | Needs something worth notifying about, and the real-time infra from Phase 2's foundation | Phase 9 onward | A check-in triggers a live update on another logged-in workstation without a page refresh |
| 14 | Settings, branding, automatic backups, receipt-printing polish | Operational hardening, done alongside or right after core modules | All above | Backup job runs on schedule and a restore drill succeeds |

---

## 3. Complete MVP roadmap

Your proposed ordering was already close to right. Adjustments below, with reasoning where it differs from what you sketched:

**Phase 1 — Foundation**
Authentication · Users · Employees · Roles · Permissions
*(matches your proposal — this is correctly first, nothing else can be gated without it)*

**Phase 2 — Core business entity**
Members · Membership Plans · Subscriptions · Payments
*(matches your proposal)*

**Phase 3 — Operational floor**
Attendance · Check-in system · Access-control abstraction (mocked)
*(matches your proposal — I'd keep this right after Phase 2, before Appointments, since check-in is the single most frequent daily action at the front desk and validates the hardware-abstraction pattern early while the codebase is still simple)*

**Phase 4 — Service delivery**
Appointments · SPA services · Beauty Institute services
*(matches your proposal)*

**Phase 5 — Commerce**
POS · Inventory
*(I split Reports OUT of this phase — see below)*

**Phase 6 — Intelligence layer**
Reports · Analytics
*(moved to its own phase rather than bundled with POS/Inventory — reports aggregate data from every prior module, so building it before POS/Inventory even exist means either building it twice or building it against incomplete data. Give it its own phase once there's real data across the whole system to report on.)*

**Phase 7 — Operational hardening**
Notifications · Settings/branding · Automatic backups · Receipt-printing polish
*(new phase, not in your original list — these are real requirements from your brief but they're cross-cutting/operational rather than a "business module," so they get their own cleanup phase rather than being silently squeezed into an earlier one)*

This is the MVP. "MVP" here means: a real, usable, sellable v1 — not a stripped demo. Everything in Phases 1-7 is required for Style Le Club to actually run their business on this day one.

---

## 4. Database design process

- **Schema evolution**: model one module's entities at the phase where that module is actually built — no speculative fields for modules three phases away. Foundational conventions (below) apply from day one regardless.
- **Migration strategy**: one migration per logical schema change, named descriptively (`add_roles_permissions`, not `update_1`). Never hand-edit an already-applied migration file — if it's wrong, write a new migration that corrects it. In production, migrations run via `prisma migrate deploy` as an explicit pre-deploy CI/CD step, always preceded by a fresh backup.
- **Relationships**: explicit foreign keys everywhere. `onDelete` behavior chosen deliberately per relation — `Restrict` for anything financially or historically significant (a Client with Payments can't be hard-deleted), `Cascade` only for genuinely dependent child records with no independent meaning (e.g., a login session tied to a User).
- **Indexing**: every foreign key indexed; every field used in search/sort/filter indexed (client search by phone/name, attendance by check-in time, payments by date); composite indexes for common compound queries (e.g., subscriptions by `clientId` + `status`).
- **Audit logs**: every create/update/delete on a financially or operationally sensitive entity (Payments, Subscriptions, Role/Permission changes, Employee changes) writes an AuditLog row — actor, action, entity, before/after snapshot. This carries forward directly from the original desktop build's design.
- **Soft deletes**: entities with business/historical significance (Client, Employee, Product, Plan) get a nullable `deletedAt` instead of a hard delete — "deleting" a client should mean "archive," not "erase their payment history." A repository-layer convention transparently excludes soft-deleted rows from normal queries. Genuinely disposable data (e.g., an expired unused invite token) can be hard-deleted.
- **Data consistency rules**: Payments always link to exactly one source (Subscription, Appointment, or Sale) — never a free-floating payment. Price/rate snapshots are frozen at transaction time so a later price change never retroactively rewrites history. Any multi-step write that must be atomic (payment + receipt numbering, sale + stock decrement) runs inside a Prisma `$transaction`.
- **Backup strategy**: automated nightly `pg_dump`, retention of 7 daily / 4 weekly / 12 monthly snapshots, offsite copy to S3-compatible storage (never rely on backups living only on the same machine as the live database), and periodic restore drills that are actually executed, not assumed to work.

---

## 5. Backend development strategy (NestJS)

- **Module structure**: one module per business capability, vertical-slice organized (a module folder contains its controller, service, repository, DTOs, and any module-specific abstractions — e.g., the hardware access-control adapter lives inside the Attendance module, not in a generic "integrations" grab-bag).
- **Controllers**: thin. Handle HTTP concerns only — route definition, DTO validation via pipe, guard application, status codes. No business logic, no direct Prisma calls.
- **Services**: contain all business logic, orchestrate one or more repositories, throw domain-meaningful exceptions.
- **Repositories**: a thin data-access layer wrapping Prisma per entity. This seam is what makes services unit-testable with mocked repositories, and it's where the soft-delete-filtering convention lives centrally rather than being repeated in every query.
- **DTO validation**: Zod schemas imported from `packages/shared`, applied via a validation pipe — the same schema a React Hook Form on the frontend uses, so validation logic never drifts between client and server.
- **Error handling**: a single global exception filter maps domain exceptions to the standard `{ error: { code, message } }` response shape. Raw Prisma errors or stack traces never reach the client.
- **Authentication flow**: login validates credentials → issues a short-lived access token (httpOnly cookie) and a longer-lived refresh token (httpOnly cookie, hashed copy stored server-side with device metadata) → protected routes validate the access token → on expiry, a refresh endpoint validates the refresh token against its stored hash, rotates it (old one invalidated), and issues a new pair. Rotation matters specifically because it lets you detect a stolen-and-replayed refresh token.
- **Authorization flow**: guards check the authenticated user's permissions (loaded from the Role/Permission tables, cached briefly per request to avoid a DB round-trip on every single call) against a route's declared required permission.
- **Background jobs**: BullMQ + Redis, one queue per job family (subscription-expiration sweeps, backups, notification dispatch, receipt generation). Jobs are written to be safely retryable.
- **WebSockets**: a NestJS Gateway authenticated via the same JWT used for REST, scoped into rooms (e.g., a "front-desk" room) so real-time events (new check-in, new payment) reach the relevant workstations without polling.

---

## 6. Frontend development strategy (Next.js)

- **App Router structure**: route groups mirror backend modules 1:1 — `(dashboard)/members`, `(dashboard)/appointments`, etc. Server Components for initial data loads where that's a genuine win (faster first paint, less client JS); Client Components for anything interactive (forms, live tables).
- **Dashboard architecture**: one shared layout shell (nav, permission-aware menu, user context) wraps every `(dashboard)` route. Permissions are loaded once at the layout level, not re-fetched per page.
- **Component strategy**: shadcn/ui as the base primitive layer; compose feature-specific components on top per module. No one-off ad-hoc styling per screen — consistent tokens, same spirit as the design system built for the earlier desktop version, adapted to Tailwind/shadcn conventions.
- **State management**: TanStack Query for all server state (API data, caching, refetching, optimistic updates) — not Redux. Local/UI-only state stays plain React state. Auth/session state lives in a lightweight React context.
- **API integration**: a typed API client wrapper with automatic access-token-refresh-on-401 retry logic, so an expired access token is invisible to the rest of the app.
- **Forms**: React Hook Form + Zod resolver, using the exact same schema the backend DTO validates against.
- **Tables**: TanStack Table for every data grid (members, payments, inventory, appointments), wired to the standardized server-side pagination/sort/filter query params from the API architecture — one pattern, reused everywhere, not reinvented per module.
- **Permissions-based UI rendering**: a `usePermission()` hook / `<Can>` wrapper conditionally renders actions based on the logged-in user's permissions. This is a UX nicety only — it is never a substitute for the backend guard actually enforcing the same permission server-side.
- **Loading/error states**: consistent skeleton loaders per data shape, a shared error-boundary + toast pattern for API failures. No screen ever just goes blank on error.

---

## 7. Security checklist

- **Authentication security**: httpOnly, Secure, SameSite cookies for both tokens; short-lived access tokens; no sensitive data inside the JWT payload beyond user id and role reference.
- **Password hashing**: argon2 (or bcrypt if argon2 native bindings ever become a deployment headache — but on a real Linux server, not an Electron sandbox, this shouldn't recur the way it did before) with an adequate cost factor.
- **Refresh tokens**: hashed at rest, rotated on every use, revocable per device — "log out this device" and "revoke all sessions" must be real, immediate operations.
- **Rate limiting**: global request throttling via NestJS Throttler, with a stricter limit specifically on the login endpoint.
- **Permissions**: enforced server-side on every sensitive endpoint. This is a direct, explicit fix for the gap flagged in the earlier desktop build, where role-gating was UI-only — that gap does not get to persist in the production ERP.
- **File uploads**: validate actual file type via content inspection (not just extension), enforce size limits, store outside the web root or behind an authenticated route, generate random filenames rather than trusting user-supplied ones.
- **HTTPS**: enforced everywhere, HTTP requests redirected, HSTS header set, certificates auto-renewed.
- **Database security**: Postgres never exposed publicly — reachable only from the API container over the internal Docker network — with a least-privilege application DB user, not a superuser.
- **VPS hardening**: SSH key-only authentication (password login disabled), non-root deploy user, firewall allowing only 22/80/443, automatic security updates, fail2ban against SSH brute-force attempts.

---

## 8. Deployment: development to production

- **VPS preparation**: provision Ubuntu LTS, apply the hardening checklist above, install Docker + Docker Compose.
- **Docker setup**: multi-stage Dockerfiles per app (a build stage, then a slim runtime stage) to keep production images small.
- **Docker Compose services**: `nginx`, `web` (Next.js), `api` (NestJS), `postgres`, `redis`, plus a scheduled backup service.
- **Nginx configuration**: reverse-proxies `/api/*` to the NestJS container and everything else to Next.js, terminates TLS.
- **Domain setup**: DNS A record pointed at the VPS IP, `server_name` configured in Nginx.
- **SSL certificates**: Let's Encrypt via certbot's Nginx plugin, auto-renewal via a systemd timer.
- **CI/CD pipeline**: GitHub Actions — on merge to `main` (or on tag, per the branch strategy in section 1): run lint/typecheck/tests → build Docker images → deploy via SSH (pull + `docker compose up -d`). Maintain a staging environment on the same VPS (different domain/port) so nothing reaches production untested.
- **Monitoring**: at minimum, uptime monitoring against a `/health` endpoint (a free tier of an external service, or a self-hosted option like Uptime Kuma if avoiding third-party dependencies matters to you).
- **Logs**: structured JSON logging (e.g., pino) with local rotation from day one; centralized log aggregation is a reasonable later addition once operational maturity justifies the extra infrastructure.
- **Rollback strategy**: keep the previous image tag available; rolling back means redeploying that tag and, if a migration was involved, restoring the pre-migration backup. Never ship a schema migration against real client data without having tested it against a copy first.

---

## 9. Production maintenance

- **Updates**: same CI/CD pipeline as deployment — schedule schema-migration-bearing deploys for low-traffic hours even though downtime should be minimal.
- **Database migrations in production**: `prisma migrate deploy` runs as an explicit pre-deploy step, always preceded by a fresh backup. Prefer additive, backward-compatible migrations (add nullable column → backfill → enforce non-null later) over destructive ones, so a brief window where old and new code both touch the schema doesn't break anything.
- **Backup restoration**: a documented, tested runbook — not just "we have backups," an actual step-by-step restore procedure, verified before go-live and periodically afterward.
- **Monitoring failures**: alerting (even simple email/SMS) on health-check failures or container crash-loops — a failure nobody gets told about isn't meaningfully monitored.
- **Adding new modules later**: by design, additive — new Prisma models + migration, new NestJS module, new Next.js route group, without touching unrelated modules. This is the actual payoff of the vertical-slice architecture chosen in section 5.

---

## 10. Commercial ERP considerations

- **Multi-branch future**: not solved today, but not blocked either — the UUID-primary-key and `updatedAt`-timestamp discipline already baked into the schema keeps a future sync/multi-branch layer an additive project, not a schema migration disaster. Revisit properly if/when a second location becomes real.
- **Mobile app future**: already a natural extension — the NestJS API is a separate, versioned service independent of the Next.js frontend, so a future mobile app is simply another authenticated client of the same API.
- **Subscription model possibility (selling this to other gyms, not just Style Le Club)**: this is a genuine fork in the road that needs a direct answer, not an assumption. If there's real intent to eventually offer this as a product to multiple gym businesses, the schema needs a `tenantId` on every table from a specific point onward — retrofitting multi-tenancy after the fact onto a single-tenant schema is a materially bigger job than building it in from the start of whichever module first needs it. **Is this being built for Style Le Club exclusively, or is a future multi-client SaaS product genuinely on the table?** This should be answered before the schema goes much further, the same way the multi-workstation question had to be answered before picking a database architecture.
- **Tenant architecture possibility**: if multi-tenant SaaS is real, row-level multi-tenancy (single database, `tenantId` foreign key on every table, enforced centrally rather than per-query) is the right choice for a small team to operate — not separate databases per client, which multiplies operational burden for little benefit at this scale.
- **Scaling strategy**: vertical scaling (a bigger VPS) is the right answer for a long time — a single-site ERP for one client is nowhere near needing horizontal scaling. Horizontal scaling (multiple API instances behind a load balancer, a managed Postgres instance) only becomes a real conversation if this genuinely becomes a multi-client SaaS product.

### Naming conventions
- Files: kebab-case (`attendance.service.ts`). Classes/components: PascalCase. Variables/functions: camelCase. Constants/env vars: SCREAMING_SNAKE_CASE.
- Database: snake_case column/table names via Prisma's `@map`/`@@map`, consistent with the convention already used in the original schema design.
- API routes: kebab-case, plural nouns (`/api/v1/members`, `/api/v1/subscriptions`).
- Git: as defined in section 1.

### Development rules
- No module is "started" without its Prisma schema reviewed first.
- No merge to `main` without passing lint, typecheck, and tests.
- No production config changed by hand on the VPS outside the documented deploy pipeline — if it's not in Git, it doesn't exist.
- Every sensitive action (payment, role change, permission change, deletion) writes an AuditLog entry — no exceptions.
- Every list endpoint supports pagination from day one.

### Definition of done, per module
A module is not "done" until:
1. Prisma schema reviewed and migrated.
2. NestJS side complete: controller, service, repository, DTOs, guards, consistent error handling.
3. Frontend side complete: route/page implemented, loading/error/empty states handled, permission-gated UI where relevant.
4. A manual test pass has been run covering the happy path and at least one realistic failure path.
5. No hardcoded secrets or credentials anywhere in the diff.
6. If the module introduces a new architectural pattern, this blueprint gets updated to reflect it.

### Testing strategy
- **Unit tests** for service-layer business logic — highest priority on anything with real rules (subscription overlap/status recalculation, receipt numbering, permission checks). This is exactly the kind of logic that caused the trickiest bugs in the original desktop build, and it's the highest-value place to put test coverage.
- **Integration tests** against a real test database (not mocks) for the critical flows — auth, payments.
- **End-to-end tests** (Playwright) reserved for the handful of true money-and-access critical paths (login, check-in, payment recording) rather than attempting exhaustive coverage of every screen. Pragmatic coverage over completionism, given team size and timeline.

---

## Status

Blueprint complete, awaiting your approval. Once approved, implementation begins with **Phase 1, Step 0**: monorepo scaffold and tooling — no code until you confirm.
