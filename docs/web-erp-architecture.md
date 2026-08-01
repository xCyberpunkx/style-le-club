# Style Le Club — Web ERP Architecture

Supersedes the earlier Electron/offline-desktop architecture. This is the web-application architecture, designed as a long-term commercial ERP.

---

## 1. Architecture review — implications of moving from desktop to web

The client's own words were "do a web app if it's better" — worth being precise about what changes and what doesn't:

**What this solves cleanly:** the multi-workstation problem disappears entirely. A web app is client-server by nature — Reception, Manager, and Administration are just three browser tabs hitting the same backend. No local-database-sharing gymnastics needed. This was the actual problem that forced the Electron+local-Postgres conversation in the first place, and a web app solves it for free.

**What this reopens, and needs an explicit answer:** the original hard requirement was "must work without internet" for a business open 09:00-22:00 daily. A traditional web app hosted on a remote VPS makes every workstation dependent on the club's internet connection. If it drops, check-in, payments, and the dashboard all stop working simultaneously. This is exactly the risk that ruled out "Option B" in the earlier desktop-vs-cloud comparison — and it doesn't go away just because the frontend is now a browser instead of Electron chrome. **This needs a direct answer from you/the client**, framed as two sub-options under "web app," not one:

- **Web app, hosted on a real remote VPS** (as the brief specifies) — simplest to build and deploy, but genuinely internet-dependent. Reasonable if the club's internet is solid and occasional downtime during an outage is acceptable to the business.
- **Web app, self-hosted on a small on-premises Linux box at the club**, reachable over the LAN by all workstations — same tech stack (Next.js, NestJS, Postgres, Docker), same "just open a browser" experience for staff, but zero internet dependency for daily operations. A real VPS/domain could still front it later for remote access (e.g., owner checking reports from home) without re-architecting anything.

I'm proceeding with the assumption that a real remote VPS is genuinely intended (per your brief), but I want this on record as a decision that was made, not defaulted into. If the club's internet isn't rock-solid, the on-prem variant is a small infrastructure change, not a rewrite — same Docker Compose stack either way.

---

## 2. Technology stack — review and recommendations

Your list is good and coherent. Specific calls:

**Backend: NestJS, not Express.** For a multi-module ERP with RBAC, background jobs, and a multi-year maintenance horizon, NestJS's built-in dependency injection, module system, and decorator-based guards map directly onto "one module per business domain" (Members, Memberships, Appointments, POS, etc.) and onto the RBAC requirement specifically — a `@Roles('ADMIN')` guard is a one-line, testable, consistent pattern across every controller. Express is a fine minimal router, but everything NestJS gives you for free (structured module boundaries, a consistent validation pipeline, guards/interceptors/exception filters as first-class concepts) would otherwise be hand-rolled and prone to drifting into inconsistent patterns across 15+ modules built over months. Given you've also explicitly asked for SOLID principles and clean architecture, NestJS is the framework that makes those the path of least resistance rather than something enforced by discipline alone.

**Monorepo tooling — the one addition I'd make to your list.** Structure this as a monorepo (pnpm workspaces + Turborepo) with the Next.js frontend and NestJS backend as separate apps sharing a `packages/shared` library. Concretely: define your Zod schemas *once* in `packages/shared`, and both the NestJS DTOs and the React Hook Form resolvers import the same schema. This eliminates an entire category of bugs where frontend and backend validation quietly drift apart over a multi-month build. Small cost to set up, real payoff by month three.

**Background jobs — add Redis + BullMQ.** This is a real server now, not an offline app faking scheduled work on read. That means genuine cron-style jobs become possible: nightly subscription-expiration sweeps, scheduled backups, receipt-email dispatch, notification delivery — all as real BullMQ jobs with retry semantics, not the "lazy recompute on next read" pattern the offline version needed. This is a meaningful upgrade, not just a nice-to-have.

**Permissions — Role + Permission tables, not a hardcoded Role enum.** The module list has grown to include POS operators, inventory managers, coaches, beauty staff, managers, and administrators — a fixed enum of roles will not flex to "give this one receptionist POS access but not refund access" without a code change and redeploy. Model `Role` and `Permission` as separate tables with a join table, and check specific permission strings in guards (`can:pos.refund`) rather than role names. The client will ask for a custom permission combination eventually; this makes that a data change, not a deploy.

**Refresh tokens — store them (hashed), don't just trust stateless JWTs.** Pure stateless refresh tokens can't be revoked — if a device is lost or an employee is terminated, you need to be able to kill their session immediately. Store a hashed reference to each issued refresh token (with device/IP metadata) so "log out this device" and "revoke all sessions for this user" are real, immediate operations, not "wait for the token to expire."

**File storage — plain disk storage on the VPS, not base64.** The Electron version used base64-encoded photos as a workaround for its CSP sandbox. That constraint doesn't exist in a web app — store client photos, waiver documents, and product images as real files on disk (or S3-compatible storage later if you outgrow one server), served through an authenticated route. Much lighter payloads, much simpler code.

**Real-time updates — NestJS's WebSocket gateway for the Notifications module and live dashboard.** "Reception sees a new check-in appear instantly without refreshing" is a natural fit for a WebSocket push rather than polling, and Nest supports this natively via `@nestjs/websockets`.

Everything else on your list (Next.js, TypeScript, TailwindCSS, shadcn/ui, Framer Motion, TanStack Table, React Hook Form, Zod, Recharts, PostgreSQL, Prisma, JWT+refresh+RBAC, Nginx, HTTPS) is exactly right for this kind of product and I have no changes to suggest.

One honesty note: you specified **Next.js 16** — recent enough that I can't fully verify version-specific API details against my training data. The App Router + Server Components model is almost certainly still the relevant approach, but worth a quick check of the current docs when we actually start implementing, rather than me asserting specifics I can't verify.

---

## 3. Folder structure (monorepo)

```
style-le-club/
├── apps/
│   ├── web/                    Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/         login, forgot-password
│   │   │   ├── (dashboard)/    main app shell, one route group per module
│   │   │   │   ├── members/
│   │   │   │   ├── memberships/
│   │   │   │   ├── attendance/
│   │   │   │   ├── appointments/
│   │   │   │   ├── spa/
│   │   │   │   ├── beauty/
│   │   │   │   ├── employees/
│   │   │   │   ├── coaches/
│   │   │   │   ├── inventory/
│   │   │   │   ├── pos/
│   │   │   │   ├── payments/
│   │   │   │   ├── reports/
│   │   │   │   ├── settings/
│   │   │   │   └── permissions/
│   │   │   └── layout.tsx
│   │   ├── components/         shared UI (shadcn/ui-based)
│   │   ├── lib/                api client, auth helpers
│   │   └── hooks/
│   │
│   └── api/                    NestJS backend
│       ├── src/
│       │   ├── modules/        one folder per business module, mirrors web/app routes
│       │   │   ├── auth/
│       │   │   ├── members/
│       │   │   ├── memberships/
│       │   │   ├── attendance/
│       │   │   │   ├── attendance.controller.ts
│       │   │   │   ├── attendance.service.ts
│       │   │   │   ├── attendance.repository.ts
│       │   │   │   └── access-control/         hardware abstraction lives here
│       │   │   │       ├── access-control-device.interface.ts
│       │   │   │       ├── mock-access-control.adapter.ts
│       │   │   │       └── zkteco-access-control.adapter.ts   (added later)
│       │   │   ├── appointments/
│       │   │   ├── spa/
│       │   │   ├── beauty/
│       │   │   ├── employees/
│       │   │   ├── coaches/
│       │   │   ├── inventory/
│       │   │   ├── pos/
│       │   │   ├── payments/
│       │   │   ├── reports/
│       │   │   ├── notifications/
│       │   │   ├── permissions/
│       │   │   └── backups/
│       │   ├── common/         guards, interceptors, filters, decorators
│       │   ├── jobs/           BullMQ processors (expirations, backups, notifications)
│       │   └── main.ts
│       └── prisma/
│           └── schema.prisma
│
├── packages/
│   └── shared/                 Zod schemas, shared TS types, constants
│       └── src/
│           ├── schemas/        one file per entity, imported by both apps
│           └── types/
│
├── infra/
│   ├── docker/                 Dockerfiles, docker-compose.yml
│   └── nginx/                  reverse proxy config, TLS
│
├── turbo.json
└── pnpm-workspace.yaml
```

**Why a repository per module (`attendance/`, `pos/`, etc.) rather than a layer per type (all controllers together, all services together):** this is the "vertical slice" organization — everything related to Attendance lives in one place, including its hardware abstraction. It scales much better than a horizontal "all controllers/ all services" split once you have 15+ modules, because you can open one folder and see everything relevant to that business capability. The `access-control/` subfolder inside `attendance/` is exactly where the ZKTeco abstraction from your brief belongs — the rest of the Attendance module (check-in history, reports, client-facing logic) never needs to know or care whether a check-in came from a receptionist's click or a turnstile's badge scan. That's the actual meaning of "abstracted, not tightly coupled."

---

## 4. Database architecture

See the ERD above. A few design decisions worth calling out explicitly:

- **UUID primary keys everywhere**, not auto-increment integers — cheap insurance for the multi-branch/sync future flagged in the earlier architecture discussion, and it costs nothing today.
- **`Payment` links to exactly one of `Subscription`, `Appointment`, or a POS `Sale`** — same "always require a link, never a free-floating payment" principle from the original design, now extended to cover the new POS and Appointments modules.
- **`Employee` is separate from `User` (login/auth)** — not every staff member necessarily needs system login (e.g., a cleaner), but every login-having person needs an Employee-equivalent profile. Worth confirming with the client whether these should actually be the same table or genuinely separate — I've modeled them separately above as the safer default, but this is a real question, not an assumption to lock in silently.
- **`Role` is a real table, referenced by `Employee`**, not a hardcoded enum — ties back to the permissions recommendation in section 2.

This ERD is intentionally not exhaustive (it omits `Product`/`Service` catalog details, `Notification`, `AuditLog`, `RefreshToken`, and the full `Permission`/`RolePermission` join table for readability) — full schema gets built module-by-module as we implement, per your own rule of working incrementally with approval at each step.

---

## 5. API architecture

- **REST, versioned from day one** (`/api/v1/...`) — cheap to add now, painful to retrofit once the mobile app or a third-party integration depends on an unversioned API.
- **DTOs validated via Zod schemas shared from `packages/shared`**, not NestJS's default class-validator — keeps one source of truth for shape validation across frontend and backend (see section 2).
- **Consistent response envelope**: `{ data, meta }` for lists (with pagination info in `meta`), `{ data }` for single resources, and a consistent `{ error: { code, message } }` shape for failures — so the frontend never has to guess the error shape module-to-module.
- **Pagination, sorting, and filtering as standard query params** on every list endpoint (`?page=&limit=&sortBy=&search=`) — TanStack Table on the frontend expects exactly this shape, so standardizing it once in a shared Nest interceptor avoids reinventing pagination logic in 15 different controllers.
- **OpenAPI/Swagger auto-generated from the NestJS decorators** — gives you free, always-current API documentation, useful both for your own reference months from now and for anyone else who joins the project.

---

## 6. Authentication & authorization

- **Access token**: short-lived (~15 min), JWT, sent as a bearer token or httpOnly cookie (recommend httpOnly cookie over localStorage — meaningfully reduces XSS token-theft risk for a commercial app handling payment data).
- **Refresh token**: longer-lived (7-30 days), httpOnly + secure + sameSite cookie, **hashed and stored server-side** with device/IP metadata (see section 2) so individual sessions can be revoked.
- **RBAC via NestJS guards** checking specific permission strings (`@RequirePermission('pos.refund')`), backed by the Role/Permission tables, not hardcoded role-name checks scattered through controllers.
- **Rate limiting on the login endpoint** specifically (NestJS Throttler) — basic brute-force protection, cheap to add, easy to forget.

---

## 7. Deployment strategy

**Docker Compose, not PM2.** You've already used Docker in a prior project (NexGen AI), so this isn't new tooling — and for a stack with four services (Next.js, NestJS, Postgres, Redis) Docker Compose gives reproducible builds, one-command spin-up on a fresh VPS, and clean rollback via image tags. PM2 is fine for a single Node process; it's the wrong tool once you're orchestrating multiple services that need to talk to each other reliably.

- **Nginx** as reverse proxy in front of both the Next.js and NestJS containers, terminating HTTPS.
- **Let's Encrypt (certbot)** for free, auto-renewing TLS certificates.
- **CI/CD via GitHub Actions**: on merge to `main`, build Docker images, push to a registry, SSH into the VPS and pull + restart via Compose. Keep a separate staging environment (same Compose stack, different domain/port) so client-facing changes get tested somewhere that isn't production.

---

## 8. VPS specification recommendation

For a single-site club with realistically 5-15 concurrent staff users (reception, manager, coaches, beauty staff) — this is not internet-scale traffic:

| Tier | Specs | Suitable for |
|---|---|---|
| **Starter** | 2 vCPU, 4GB RAM, 80GB SSD | Comfortable for this workload; Next.js + NestJS + Postgres + Redis all fit with room to spare |
| **Recommended if budget allows** | 4 vCPU, 8GB RAM, 160GB SSD | Headroom for the POS/reporting modules under real daily load, and for running staging alongside production on the same box early on |

Providers: **Hetzner** (best cost-per-spec, EU-based) or **DigitalOcean** (slightly pricier, very easy managed-database upgrade path later if you ever want to offload Postgres to a managed instance). Either is a reasonable, unglamorous choice — no need to overthink the provider.

---

## 9. Backup strategy

- **Automated nightly `pg_dump`**, scheduled via a BullMQ job (or a simple cron container) — not a manual "remember to do it" process.
- **Retention policy**: keep 7 daily, 4 weekly, 12 monthly snapshots — enough history to recover from "we didn't notice this was wrong for two weeks" without keeping every backup forever.
- **Offsite copy is non-negotiable**: push backups to a separate object storage (Backblaze B2 or S3-compatible) in addition to keeping them on the VPS itself. A backup that lives only on the same machine as the live database doesn't protect you from that machine failing.
- **Restore drills**: actually test a restore periodically, not just trust that the backup files exist. A backup nobody has ever restored from is a hypothesis, not a safety net.

---

## 10. Updates & future mobile support

**Updates got dramatically simpler by moving off Electron.** The entire auto-updater complexity (code signing, staged rollouts, "what if the update fails mid-download") that Electron desktop apps require simply doesn't apply to a web app — deploying an update is just shipping new code to the VPS via the CI/CD pipeline in section 7. Staff refresh their browser (or don't even need to, depending on caching strategy) and get the new version. This is a genuine simplification worth naming explicitly, not just a side effect.

**Mobile app compatibility is a natural extension, not a re-architecture.** Because the NestJS API is already a separate, versioned service independent of the Next.js frontend, a future React Native or Flutter mobile app would simply become another authenticated client of the same API — zero backend changes required, assuming the API was designed API-first (which it is, per section 5). This is one of the concrete payoffs of the decoupled frontend/backend architecture over a monolithic Next.js-only approach.

---

## What I need from you before implementation starts

1. **Decision on section 1**: true remote VPS vs. self-hosted on-premises box — I need this settled before finalizing the deployment target, since it affects the Nginx/TLS setup either way.
2. Confirmation on `Employee` vs `User` — same table or separate (section 4).
3. Everything still outstanding from the original intake: commercial proposal PDF, Lovable screenshots, logos/branding, membership rules, receipt format, printer model, payment/appointment/inventory workflows — whenever available.
4. Your go-ahead to start with a specific first module once the above is settled. Given the scope, I'd suggest **Auth + RBAC + the Employee/Role foundation** as the literal first module, since every other module depends on it existing correctly — but this is your call to confirm.

No code this turn, per your instruction. Waiting on your direction.
