# Style Le Club — Project Context Document

Living reference doc. Same purpose as `BOOKINGO_CONTEXT.md` on the CTRLi side: any future conversation about this project should start by reading this, so nothing has to be re-explained. Update it whenever a phase closes or a decision changes.

---

## 1. What this project is

A commercial multi-module ERP for **Style Le Club** — a gym / SPA / beauty institute in Alger, Algeria ("Rue Saint Charles, Alger — open 9h to 22h, 7 days a week"). Originally scoped as an Electron desktop app, **superseded by a web-app architecture** (see history below). Designed from day one to be schema-ready for a future multi-client SaaS pivot, even though it's single-tenant (Style Le Club only) today — that pivot is **not decided**, only kept cheap.

**Two source-of-truth docs already exist and this doc does not replace them:**
- `project-blueprint.md` — monorepo setup, coding standards, phase-by-phase build order, security/deployment checklist, definition of done.
- `web-erp-architecture.md` — stack rationale, folder structure, ERD notes, API conventions, VPS sizing, backup strategy.

This doc adds: (a) what's actually implemented vs. what's just designed, and (b) a full inventory of the Lovable mockups so the intended UI/data scope is captured in one place.

---

## 2. History — why web, not desktop

The original brief required "must work without internet." Electron + local Postgres was explored to solve multi-workstation sharing without internet dependency. Client said "do a web app if it's better," which solves the multi-workstation problem for free (browser tabs hitting one backend) but **reopens the internet-dependency question** — a real remote VPS makes every workstation dependent on club internet.

**Status: proceeding on the assumption of a real remote VPS** (per brief), with an on-prem LAN-hosted variant flagged as a small infra change (not a rewrite) if the club's internet turns out to be unreliable. **This was never explicitly confirmed by the client — still open.**

---

## 3. Confirmed stack & architecture decisions

- **Monorepo**: pnpm workspaces + Turborepo. `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared` (Zod schemas shared by both — single source of truth for validation, no drift between frontend/backend).
- **Frontend**: Next.js **14.2.15** (App Router) — the "16, unverified" note in earlier drafts was aspirational; 14.2.15 is what's actually installed and building as of Phase 5. TypeScript strict, TailwindCSS, hand-rolled shadcn-style primitives (Button/Input/Label — not the shadcn CLI, just matching its conventions/CSS-variable theming so real shadcn components can be dropped in later without a re-theme). TanStack Query (not just "React Hook Form + Zod" — Query owns all server-state/caching). Framer Motion, TanStack Table, Recharts, Swagger are still **aspirational only** — none of these are installed or used yet; they'll come in whichever phase first needs them (business data tables, charts, animated transitions).
- **Backend**: NestJS (chosen over Express specifically for DI, module boundaries, and decorator-based guards mapping cleanly onto RBAC across 15+ modules).
- **DB**: PostgreSQL + Prisma. UUID primary keys everywhere (cheap insurance for future multi-branch/sync).
- **Background jobs**: Redis + BullMQ — nightly subscription-expiration sweeps, scheduled backups, receipt-email dispatch, notification delivery.
- **Auth**: JWT access (short-lived, ~15 min) + refresh (7–30 days), both httpOnly/Secure/SameSite cookies. Refresh tokens **hashed at rest**, stored server-side with device/IP metadata — real, immediate per-device revocation, not stateless "wait for expiry."
- **Permissions**: `Role` + `Permission` tables (not a hardcoded enum), joined via `RolePermission`. Guards check permission strings (`can:pos.refund`), not role names. A new permission combo becomes a data change, not a redeploy.
- **File storage**: real files on disk (or S3-compatible later), served through an authenticated route — no base64 (that was an Electron CSP workaround, doesn't apply here).
- **Real-time**: NestJS `@nestjs/websockets` gateway for live dashboard/notifications (e.g. check-in appears instantly on another workstation).
- **API**: REST, versioned (`/api/v1/...`) from day one. Response envelope: `{ data, meta }` for lists, `{ data }` for single resources, `{ error: { code, message } }` for failures. Pagination/sorting/filtering as standard query params (`?page=&limit=&sortBy=&search=`) via a shared Nest interceptor. Swagger auto-generated from decorators.
- **Deployment**: Docker Compose (nginx, web, api, postgres, redis, backup service) — not PM2. Nginx reverse-proxies `/api/*` to NestJS, everything else to Next.js, terminates TLS. Let's Encrypt/certbot. GitHub Actions CI/CD: merge to `main` → build images → SSH deploy → Compose restart. Separate staging env on same VPS.
- **VPS sizing**: Starter tier (2 vCPU / 4GB RAM / 80GB SSD) is comfortable for the realistic 5–15 concurrent staff workload. This is not internet-scale traffic — the module-count complexity, not user-count, is what justifies the stack.
- **Backups**: nightly `pg_dump`, 7 daily / 4 weekly / 12 monthly retention, offsite copy to Backblaze B2 or S3-compatible (non-negotiable), periodic restore drills.

---

## 4. Build status — what's actually implemented

**Schema currently covers Phase 0–4 only** (Foundation: Auth + RBAC + Employee/Role). Confirmed models in `schema.prisma`:

| Model | Purpose |
|---|---|
| `Organization` | Tenant root. Style Le Club is the only row today. `slug` reserved for future subdomain routing. |
| `User` | Login account. Deliberately separate from `Employee` — not every staff member needs login (e.g. a cleaner), but every login-having person needs an Employee profile. **Flagged in the schema comments as a real open question, not a locked decision** — revisit if the separation causes friction. |
| `Employee` | Staff profile. Optional 1:1 link to `User`. Has `roleId`, soft delete (`deletedAt`) so staff history survives departure. |
| `Role` | Tenant-scoped (`@@unique([organizationId, name])`). Each org composes its own roles from the shared `Permission` catalog. |
| `Permission` | Deliberately **global**, not tenant-scoped — a fixed system catalog of capability strings (e.g. `members.create`, `pos.refund`), seeded via migration/seed script. |
| `RolePermission` | Join table, `@@id([roleId, permissionKey])`, cascade delete both directions. |
| `RefreshToken` | Hashed token, device/IP metadata, `revokedAt` — enables real session revocation. |
| `AuditLog` | `actorUserId` nullable (system-initiated actions still log), `oldValue`/`newValue` as `Json?`, indexed on `[entityName, entityId]`. |

**Every business entity below this line does not exist in the schema yet.** No `Member`, `Plan`, `Subscription`, `Appointment`, `Service`, `CheckIn`, `Payment`, `Product`, `Sale`, or `Notification` model. That's expected — it's Phases 6–14 — but it means the mockups below (Section 5) are well ahead of the schema, and several design decisions implied by them aren't resolved in the data model yet (see Section 6).

**Currently**: Phases 0–5 complete and verified. Phase 4 (Employees/Roles/Permissions CRUD, RBAC-gated) and Phase 5 (Next.js auth vertical slice) are both done — see Section 8 for what Phase 5 actually shipped and the one real bug hit along the way (now resolved, kept here as a lesson rather than an open item). Next up: Phase 6, first real business module (per the blueprint's phase table — confirm exact scope with the blueprint before starting, since this doc's Section 5/6 module inventory is scoped from Lovable mockups and runs well ahead of what's actually been decided for the schema).

---

## 5. Module inventory — data model implied by each screen

Source: Lovable design mockups (`styleclub-nexus.lovable.app`). **These are UI/UX mockups with fake seeded data, not screens wired to the real NestJS API** — treat as a design + feature-scope reference, not a status report. Numbers, names, and sample values shown in them are placeholder data and are intentionally omitted below; only the structural facts (entities, fields, relationships, states) that the schema needs to support are captured.

General shell across every screen: left sidebar grouped into **Overview** (Dashboard, Members, Memberships, Attendance, Appointments), **Wellness** (SPA Services, Beauty Institute, Coaches, Employees), **Commerce** (POS, Products, Inventory, Payments, Reports), **System** (Notifications, Settings, Help). Top bar: global search, weather widget, date, Quick actions dropdown, dark-mode toggle, notification bell with unread count, user avatar showing current employee's role.

### Dashboard
Pure aggregation screen — no new entities. Pulls from Members, Attendance, Payments, Appointments, Products/Sales, Subscriptions. Needs: total/active member count, today's check-in count, revenue rollups (by period and by category), appointment count, units sold, renewal count, a revenue-by-category breakdown, a membership-growth-over-time series, an attendance-by-weekday series, a top-selling-products ranking, a recent-payments list, and an upcoming-appointments list. Confirms Reports (Section on Reports below) and Dashboard likely share the same aggregation service layer.

### Members
Core entity: `Member` (the client). Fields implied: name, generated member ID, phone, assigned membership plan (FK to `Subscription`/`Plan`), **status** (Active / Expired / Frozen — an enum, not boolean), assigned coach (FK to Employee/Coach), age, weight, height, a free-text or enum "goal" field, join date, plan expiry date. List needs search + filter (status, plan, coach) + pagination + export, per the blueprint's "every list endpoint paginated" rule.

### Memberships
Two distinct entities needed, not one: **`Plan`** (the catalog: name, duration, price, feature list, "popular" flag) and **`Subscription`** (a specific member's enrollment in a plan: start/end date, current status). Status must support **Active / Expired / Frozen / Cancelled**, with explicit actions for Renew, Upgrade, Freeze, Cancel — so `Subscription` needs enough history/state to make those transitions auditable (ties to `AuditLog`). Plans vary in structure: some are per-person, some (e.g. a "couple" style plan) cover two linked members under one subscription — confirm whether that's modeled as one `Subscription` with two `Member` links or two `Subscription` rows sharing a reference.

### Attendance
Core entity: `CheckIn`. Fields: member reference, **area** (an enum — the club has multiple physical zones: general gym floor, pool, SPA, beauty institute, group-class room), check-in timestamp, check-out timestamp (nullable while still inside), computed session duration. Screen needs both a real-time "currently inside" count and historical views (calendar day picker, hour-of-day distribution, day×hour heatmap) — all derivable from `CheckIn` timestamps, no separate aggregate table needed if indexed well.

### Appointments
Core entity: `Appointment`. Must support **multiple participants per booking** — some sessions involve exactly one member + one staff member, others involve two members (e.g. a couple booking) or a group. This means a join table (`AppointmentParticipant` linking `Appointment` to either `Member` or `Employee` with a role: CLIENT vs PROVIDER), not a simple pair of FK columns. Fields on `Appointment` itself: service reference, scheduled time, status (Confirmed / Pending / Cancelled), price. Multiple view modes (daily/weekly/monthly/timeline/board) are frontend concerns only — no schema impact. Appointments reference the same service catalog as SPA/Beauty (see below) plus what look like pure-fitness session types — confirm whether fitness sessions are also `Service` rows or a separate concept.

### SPA Services / Beauty Institute
Both screens follow an identical shape: a service catalog with name, description, duration, price, a popularity/demand percentage, and one or more assigned staff (therapists/specialists). This strongly suggests **one `Service` model** with a `category` enum (`SPA | BEAUTY`, extensible) rather than two separate models — especially since Appointments appears to reference these same service names. Popularity/demand percentage is presumably a derived/computed value (booking frequency), not manually entered — decide whether it's computed on read or maintained as a rolling stat.

### Coaches
Distinct profile data not present on the base `Employee` model: specialty/discipline, star rating, client count, capacity percentage (scheduling load), working hours, revenue attributed to that coach. Open question already flagged in Section 6: whether this is a `CoachProfile` extension of `Employee` or a separate `Coach` model referencing `Employee`.

### Employees
Extends the current `Employee` model with fields not yet in the schema: department, shift/working-hours, attendance percentage, performance percentage, salary. Confirm whether attendance % here is derived from staff check-in data (a parallel concept to member `CheckIn`, or the same mechanism reused) or entered manually.

### POS
Needs a `Sale` (or `Order`) entity with line items (`SaleItem`: product reference, quantity, unit price at time of sale) plus discount percentage, VAT calculation (fixed rate observed), payment method, and total. A completed sale should produce a `Payment` row linked back to it, consistent with the "Payment always links to exactly one source" rule.

### Products / Inventory
Both screens show the same underlying fields (name, category, barcode, supplier, cost, price, margin, stock quantity, expiry date) — strongly suggests **one `Product` model** serves both, with Inventory being a filtered/alert view (low stock below a reorder threshold, out of stock, expiring soon) rather than a separate entity. A restock/purchase-order flow implies a `PurchaseOrder` (and possibly `PurchaseOrderItem`) entity referencing `Product` and `Supplier`.

### Payments
Core entity: `Payment`/`Invoice`. Fields: invoice number, customer (member) reference, **category** (Retail / Membership / SPA / Beauty — mirrors the source it's linked to), item count, method (Cash / Card / Mixed — note "Mixed" implies a payment can split across methods, possibly needing a `PaymentSplit` sub-table rather than a single enum), date, status (Paid / Pending / Refunded), total. Must satisfy the architecture doc's rule: **links to exactly one of** `Subscription`, `Appointment`, or `Sale` — never free-floating. Worth enforcing this at the DB level (a check constraint or exactly-one-of pattern), not just in application code.

### Reports
Same aggregation nature as Dashboard, just longer time horizons and different chart selection (revenue vs. expenses implies an `Expense` concept doesn't exist yet anywhere else in scope — confirm whether expense tracking is actually in scope or the mockup is aspirational beyond what's been discussed).

### Notifications
Two distinct feeds are shown: an **Alerts** feed (system-generated, has a read/unread state, examples include expiring memberships, low stock, overdue payments, birthdays, scheduling reminders) and an **Activity feed** (a log of actions taken by staff/system — closely mirrors the existing `AuditLog` model's purpose). Recommend keeping two models: `Notification` (operational, user-facing, read/unread) distinct from `AuditLog` (compliance/audit trail, already built) — the Activity feed can likely be a formatted read of `AuditLog` rather than a new table.

---

## 6. Gap analysis — decisions to make before/while building Phases 6–14

These are open questions raised by comparing the mockups against the current schema, not yet resolved:

1. **Coach vs Employee vs Member.** Coaches carry rating, capacity %, working hours, per-coach revenue — none of which exist on `Employee`. Options: (a) `Employee` gets an optional `CoachProfile` extension, or (b) a separate `Coach` model referencing `Employee`. The blueprint's own note on `Employee` vs `User` separation suggests following the same "separate table, optional link" pattern here.
2. **Subscription status needs a `Frozen` state**, not just Active/Expired — mockup has an explicit Freeze action and Frozen badge. `Subscription.status` should be an enum: `ACTIVE | EXPIRED | FROZEN | CANCELLED` (not a boolean).
3. **Appointments are multi-party.** Session cards show one or two named participants per booking (e.g. couple sessions, or member + assigned staff). This needs a join table (`AppointmentParticipant`), not a single FK — a plain `memberId`/`staffId` pair won't hold the "Couple" case.
4. **Payment must link to exactly one of** `Subscription`, `Appointment`, or a POS `Sale` — this is an explicit rule from the architecture doc ("always require a link, never a free-floating payment"). Worth enforcing with a DB constraint (e.g. exactly-one-of-three-FKs-non-null check), not just app-level discipline, since it's easy to violate silently otherwise.
5. **Product and Inventory appear to be the same underlying table** (Products page and Inventory page show identical fields: stock, supplier, expiry). Confirm one `Product` model serves both screens rather than two overlapping models.
6. **Notification vs AuditLog overlap.** The Activity feed reads like a filtered/formatted view of `AuditLog`, while Alerts look like a genuinely separate `Notification` model (system-generated, has read/unread state, no `oldValue`/`newValue`). Recommend keeping them distinct: `AuditLog` = who-changed-what (compliance/audit), `Notification` = user-facing alert (operational).
7. **Service catalog spans two modules** (SPA and Beauty) with near-identical shape (name, duration, price, popularity/demand %, assigned staff) but different field labels. Likely one `Service` model with a `category` enum (`SPA | BEAUTY`) rather than two separate models — cross-check against whether Appointments also references this same `Service` table (it appears to, since appointment session names match service names in both modules).
8. **User ↔ Employee separation** — flagged as an open question directly in the schema comments. Still unresolved; revisit once Phase 6+ makes the real usage pattern (how often does a "login-less" Employee actually occur — e.g. cleaners) clearer.

---

## 7. Naming & process conventions (carried over from the blueprint, for quick reference)

- Files: kebab-case. Classes/components: PascalCase. Variables/functions: camelCase. Env vars: SCREAMING_SNAKE_CASE.
- DB: snake_case via Prisma `@map`/`@@map` (already applied throughout the current schema).
- API routes: kebab-case, plural nouns, versioned (`/api/v1/members`).
- One NestJS module = one business capability (vertical slice) — never a horizontal "all controllers here" split.
- DTOs/forms derive from the same Zod schema in `packages/shared` — never hand-duplicate a shape.
- Every list/table endpoint supports pagination from day one, even at 10 rows.
- No module is "started" without its Prisma schema reviewed first.
- Every sensitive action (payment, role change, permission change, deletion) writes an `AuditLog` entry — no exceptions.
- A module isn't "done" until: schema migrated, full Nest side (controller/service/repository/DTOs/guards/error handling), full frontend side (route, loading/error/empty states, permission-gated UI), a manual happy-path + failure-path test pass, no hardcoded secrets, and this doc/blueprint updated if a new pattern was introduced.

---

## 8. Phase 5 — what shipped, and one resolved bug worth knowing about

**Shipped**: `apps/web` real Next.js scaffold (split-screen login, dashboard shell with sidebar/topbar), `GET /api/v1/auth/me` added to the NestJS auth module (the access-token JWT only carries `sub`/`organizationId`/`employeeId`/`permissions` — no display name/email/role label — so the frontend needed a way to ask "who am I" without decoding an httpOnly cookie it can't read), CORS enabled on the API (`app.enableCors({ origin: env.CORS_ORIGIN, credentials: true })`, new `CORS_ORIGIN` env var defaulting to `http://localhost:3000`), a typed `apiFetch` wrapper with silent access-token-refresh-and-retry-once on 401, and `usePermission()`/`<Can>` for permission-gated UI (backend guard is still the real enforcement — this is UX-only).

**Resolved bug, worth remembering**: after wiring the dashboard's "redirect to `/login` if unauthenticated" logic using Next.js App Router's client-side `router.replace()`, we hit a genuine redirect ping-pong between `/dashboard` and `/login` — confirmed via the Network tab's `Doc` filter showing repeated `login?_rsc=...` client-navigation payload fetches, not just repeated API calls. Root cause never got fully pinned to one exact mechanism (most likely candidate: the two routes share one in-memory TanStack Query cache across the client-side transition, and a race between stale cached data and a fresh 401 produced the bounce), but the fix was architectural rather than a timing patch: **all three auth-boundary transitions (unauthenticated→login, login→dashboard, logout→login) now use a hard `window.location.href` navigation instead of `router.replace()`**. A full page load guarantees a fresh JS environment and a brand-new query cache every time, which makes the bounce structurally impossible regardless of the exact original mechanism. Costs one extra full page load at each of those three (rare) moments — a fine trade. If a future session is tempted to "optimize" these back to client-side `router.replace()` for a snappier transition, know why they're hard navigations first.
