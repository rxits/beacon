# Beacon — Architecture Decision Records

> Records the *rationale and tradeoffs* behind decisions already made in
> [`00-product-spec.md`](./00-product-spec.md). These ADRs do not re-open the
> decisions; they document why each was chosen over the real alternatives.
> Format: [MADR](https://adr.github.io/madr/). Canonical names per spec §12.

**Status of this document:** all records Accepted · **Date:** 2026-07-16

## Index

| ID | Decision | Status |
|---|---|---|
| [ADR-0001](#adr-0001--nextjs-15-app-router-rsc--route-handlers) | Next.js 15 App Router (RSC + route handlers) as the full-stack framework | Accepted |
| [ADR-0002](#adr-0002--postgresql--drizzle-orm-over-prisma) | PostgreSQL + Drizzle ORM over Prisma | Accepted |
| [ADR-0003](#adr-0003--authjs-v5-with-credentials--google-oauth) | Auth.js v5 with Credentials (bcrypt) + Google OAuth | Accepted |
| [ADR-0004](#adr-0004--monochrome-black-and-white-design-system-with-liquid-glass) | Monochrome black-and-white design system with liquid glass | Accepted |
| [ADR-0005](#adr-0005--recharts--react-simple-maps-for-charts--world-map) | Recharts + react-simple-maps for charts + world map | Accepted |
| [ADR-0006](#adr-0006--sse--postgres-listennotify-for-the-live-feed) | SSE + Postgres LISTEN/NOTIFY for the real-time live feed | Accepted |
| [ADR-0007](#adr-0007--geoip-lite-offline-geo-lookup) | geoip-lite offline geo lookup | Accepted |
| [ADR-0008](#adr-0008--tanstack-table--virtual-for-the-activity-table) | TanStack Table + Virtual for the activity table | Accepted |
| [ADR-0009](#adr-0009--seed-20-demo-users--real-capture-hybrid-data-strategy) | Seed 20 demo users + real capture (hybrid data strategy) | Accepted |
| [ADR-0010](#adr-0010--pnpm--typescript-strict-tooling-baseline) | pnpm + TypeScript strict tooling baseline | Accepted |

---

## ADR-0001 — Next.js 15 App Router (RSC + route handlers)

**Status:** Accepted

### Context
Beacon is one app that must do two jobs at once: serve a read-heavy, highly
interactive dashboard (KPI tiles, map, charts, live table) and act as its own
telemetry backend (`/api/track` ingest, `/api/events`, `/api/stats`,
`/api/stream`, `/api/auth/*`). Ingest must run server-side to derive IP/geo/device
(spec §5 — never trust the client). It is also a hiring deliverable, so the
framework choice is itself a signal. React 19 is the target UI runtime.

### Decision
Use **Next.js 15 with the App Router**. React Server Components fetch dashboard
data on the server (no client waterfalls, secrets stay server-side); route
handlers implement every `/api/*` endpoint in the same deployment; middleware
guards `/dashboard/*` and redirects unauthenticated users to `/login` (spec §4, §8).
One repository, one deployable.

### Alternatives considered
- **Vite SPA + separate Express/Fastify API** — two deployables, hand-wired auth
  and CORS, no RSC, client-side data waterfalls, more glue for no gain. Splits a
  small project across two runtimes.
- **Remix / React Router 7** — excellent nested data-loading story, but RSC
  support was less mature, and the rest of the chosen stack (Auth.js v5 adapter,
  Vercel-class deploy, component libs) aligns more cleanly with Next.
- **SvelteKit / Nuxt** — strong full-stack frameworks, but the ecosystem we
  depend on (React 19, Recharts, TanStack, Auth.js) is React-centric; picking
  these would fight every downstream library choice.
- **Astro** — content/islands-first; a misfit for an app-shell dashboard whose
  whole surface is interactive.

### Consequences
- **Good:** single repo and deploy; server-side capture co-located with the UI;
  RSC eliminates most client data-fetching boilerplate; first-class middleware
  auth guard; SSE streams cleanly from a route handler (ADR-0006).
- **Bad:** the server/client-component boundary is a real learning curve;
  interactive charts and the table need deliberate `"use client"` islands;
  App Router is opinionated and there is gravity toward Vercel hosting.
- **Neutral:** commits us to React 19 and the App Router (not Pages Router).

---

## ADR-0002 — PostgreSQL + Drizzle ORM over Prisma

**Status:** Accepted

### Context
The `events` table is append-heavy on write and aggregation-heavy on read: KPIs
(`total_visits`, `unique_visitors`, `signed_in_ratio`, `live_now`, `top_country`)
and the visits-over-time series need time-bucketed counts, distinct counts, and
group-bys (spec §9). We also need type-safe schema + migrations over Postgres 16
and a session adapter for Auth.js (spec §4, §7). Route handlers may run in a
serverless context, so runtime weight and cold start matter.

### Decision
Use **Drizzle ORM** on **PostgreSQL 16**. TypeScript schema is the single source
of truth (`pnpm db:push`); Drizzle's official Auth.js adapter backs DB sessions;
analytic reads use Drizzle's SQL-first query API. Prisma is acknowledged in the
spec as the alternative — this ADR records why it was not chosen.

### Alternatives considered
- **Prisma** — mature DX and tooling, but a heavier model: separate schema DSL,
  a generated client, and a query-engine binary that inflates cold starts; and
  historically the analytic queries we lean on (time buckets, windowed counts)
  drop to `$queryRaw`, forfeiting the type-safety that is Prisma's main draw.
- **Kysely** — superb type inference, but it is a query builder only: no
  schema-as-source-of-truth, no migrations, no Auth.js adapter — more to wire.
- **Raw `pg` + hand-written SQL** — maximal control, zero abstraction cost, but
  untyped result rows, manual migrations, and a hand-rolled session adapter.
- **TypeORM / Sequelize** — older active-record/decorator baggage and weaker TS
  inference than the modern options.

### Consequences
- **Good:** SQL-first API expresses aggregates naturally without escape hatches;
  thin runtime and fast cold starts; TS schema is the single source of truth;
  official Drizzle Auth.js adapter; parameterized queries close the injection
  vector (spec §11).
- **Bad:** younger ecosystem than Prisma; fewer batteries (migration tooling is
  less magical, no Studio equal); some deep relation queries are more verbose.
- **Neutral:** we own more of the query shape — a benefit for analytics, a minor
  cost for routine CRUD.

---

## ADR-0003 — Auth.js v5 with Credentials + Google OAuth

**Status:** Accepted

### Context
The assignment requires real authentication, not a facade. Two methods are in
scope: email + password (Credentials) and "Continue with Google" (OAuth). The
spec mandates DB-backed sessions via a Drizzle adapter, bcrypt (cost 12) hashing
with zod validation, and middleware guarding `/dashboard/*` (spec §4). All
visitor PII/IP data should stay in our own Postgres.

### Decision
Use **Auth.js (NextAuth v5)** with the **Credentials** provider (bcrypt cost 12,
zod-validated signup) and the **Google** provider, wired to the **Drizzle Postgres
adapter** with **DB sessions** across tables `users`, `accounts`, `sessions`,
`verification_tokens` (spec §12). Middleware enforces the route guard.

### Alternatives considered
- **Clerk / Auth0 / WorkOS (hosted)** — fastest, polished, but an external
  dependency with pricing, weaker "I built real auth" signal, and it would route
  identity/PII through a third party rather than our Postgres.
- **Lucia Auth** — lightweight and you-own-it, but Lucia was transitioning to a
  learning resource rather than a maintained library; betting the auth layer on
  it is avoidable risk. Auth.js ships the Drizzle adapter and Google provider we
  need today.
- **Hand-rolled sessions (iron-session / jose + cookies)** — full control, but
  re-implementing the OAuth dance, CSRF, and session rotation is exactly the
  security-critical wheel not to reinvent.
- **Supabase Auth** — solid, but couples auth to Supabase's platform when we
  already operate Postgres directly.

### Consequences
- **Good:** Credentials + Google in one library; built-in CSRF (spec §11); DB
  sessions through the Drizzle adapter; first-class Next 15 middleware
  integration; all identity data stays in our database.
- **Bad:** Auth.js v5 shipped with churny docs and sharp edges — notably,
  Credentials defaults to JWT sessions, so pairing it with DB sessions needs
  deliberate configuration; more wiring than a hosted service.
- **Neutral:** we operate our own auth — patching and `sessions` table growth are
  ours to own.

---

## ADR-0004 — Monochrome black-and-white design system with liquid glass

**Status:** Accepted

### Context
Analytics dashboards default to color — a blue primary and a categorical chart
palette. The assignment rewards senior-level craft and a memorable point of view
(spec §2, §10). The team chose a hard constraint: pure black/white/calibrated
grays with **no color accent**, plus liquid-glass surfaces on header, tiles,
sidebar, and modals. The constraint is the concept: craft under limitation.

### Decision
Adopt a **monochrome** system — pure black, white, and calibrated grays, zero
color accent — with **liquid glass** (layered `backdrop-blur`, thin light borders,
inner/outer glow, specular sheen). Charts encode series by **opacity, stroke
style, texture, and direct labels**, never hue (spec §10). Dark-first with a
persisted light toggle; both themes fully designed.

### Alternatives considered
- **Conventional multi-color dashboard** — trivial series differentiation and
  familiar, but generic "every dashboard" look; color becomes a crutch that
  masks weak typography and layout.
- **Monochrome + one brand accent** — safer, lets a single color carry emphasis,
  but dilutes the austere, editorial concept; the discipline of *zero* accent is
  precisely the differentiator.
- **Off-the-shelf theme (Tremor / shadcn defaults / Material)** — fast and
  consistent, but reads as templated and cannot reach the liquid-glass editorial
  feel.

### Consequences
- **Good:** distinctive and memorable; forces craft into type, space, contrast,
  and texture; AA contrast is trivially met in monochrome (spec §10); no palette
  bikeshedding.
- **Bad:** encoding categorical series without hue is genuinely hard — everything
  leans on opacity/texture/pattern/direct labels; miscalibrated grays risk
  low-contrast glass; the density-shaded map has a narrow value range to work in.
- **Neutral:** delight rests more on motion and glass, which must stay behind
  `prefers-reduced-motion` (spec §10); every chart needs an explicit non-color
  encoding decision (apply the `dataviz` skill).

---

## ADR-0005 — Recharts + react-simple-maps for charts + world map

**Status:** Accepted

### Context
Three graph surfaces are required: visits-over-time (area/line with range
toggle), a device/referrer breakdown (donut + bars), and a world map shaded by
visit density with hover tooltips (spec §9). Everything must restyle to strict
monochrome (ADR-0004) and render well in React 19. The map must not depend on a
tile server or API key, to stay consistent with the offline-geo choice
(ADR-0007).

### Decision
Use **Recharts** for the time-series and breakdown charts, and
**react-simple-maps** for the world map (SVG choropleth from local TopoJSON,
country fill shaded by density, hover tooltip).

### Alternatives considered
- **visx (D3 primitives in React)** — maximal control and ideal for bespoke
  monochrome, but low-level: axes, tooltips, and legends are hand-built. Recharts
  reaches ~90% of the result for a fraction of the code and still restyles to
  monochrome.
- **Raw D3** — ultimate control, but imperative DOM ownership fights React's
  render model and is the most to build and debug.
- **Tremor** — batteries-included, but bakes in color/theme that resists a pure
  monochrome + glass treatment and the specific stroke/texture encodings we need.
- **Chart.js / ECharts** — powerful canvas engines, but non-idiomatic React
  wrappers, harder to match crisp monochrome/glass, and ECharts is heavy.
- **Mapbox / deck.gl for the map** — tile-server and API-key heavy, and inherently
  colorful — conflicting with both the monochrome ethos and offline geo.

### Consequences
- **Good:** fast path to a polished result; both libraries render SVG (crisp,
  themeable, restyled to monochrome via props/CSS); react-simple-maps needs no
  tiles or key (aligns with ADR-0007); composes naturally in React.
- **Bad:** Recharts is less flexible for truly custom marks — some texture/pattern
  encodings need custom SVG `defs`; react-simple-maps is lower-activity in
  maintenance; a point-dense SVG map can get heavy (mitigate by aggregating to
  country level).
- **Neutral:** commits charts to SVG (fine at this data scale); we may still drop
  to hand-written SVG for the occasional bespoke encoding.

---

## ADR-0006 — SSE + Postgres LISTEN/NOTIFY for the live feed

**Status:** Accepted

### Context
The signature moment is a visit appearing in the live feed within about a second,
then flipping from anonymous IP to a named identity on sign-in (spec §1). That
needs a server→client push of newly inserted events. Beacon is a single Next
deployment with no separate realtime service, and the spec already names polling
`/api/events` as the required fallback (spec §8, §13).

### Decision
Stream new events over **Server-Sent Events** from the `/api/stream` route
handler. Use **Postgres `LISTEN`/`NOTIFY`** so an insert on `/api/track` wakes the
stream (the DB is the message bus). A single shared listener connection fans out
to in-process SSE subscribers. If SSE is unavailable, the client **falls back to
polling `/api/events`**.

### Alternatives considered
- **WebSockets (raw or socket.io)** — bidirectional, but we only need one
  direction; WS requires a persistent upgrade that Next route handlers don't
  serve natively (often a separate server/adapter) plus reconnection/heartbeat
  plumbing. SSE rides plain HTTP, auto-reconnects, and traverses proxies.
- **Polling only** — dead simple, but either laggy (long interval) or wasteful
  (short interval hammering Postgres), and it undercuts the sub-second moment.
  Kept deliberately as the *fallback*, not the primary path.
- **Managed realtime (Pusher / Ably / Supabase Realtime)** — turnkey, but an
  external dependency with a key and cost, beyond a self-contained app.
- **In-memory `EventEmitter` pub/sub** — works only on a single instance and
  drops events that a different connection/instance inserted; `LISTEN/NOTIFY`
  makes Postgres the broker so any inserter notifies all streams.

### Consequences
- **Good:** SSE is one endpoint with native `EventSource` auto-reconnect and no
  extra service; `LISTEN/NOTIFY` reuses Postgres as the bus (no Redis/broker);
  polling fallback guarantees the feed always works (spec §13).
- **Bad:** SSE holds a long-lived connection — serverless/edge runtimes cap
  durations (favor the Node runtime or a long-timeout host), and naive designs
  pin one DB connection per client for `LISTEN` (the shared-listener + fan-out
  pattern avoids this); HTTP/1.1's ~6-connections-per-domain limit applies
  (fine here; HTTP/2 mitigates).
- **Neutral:** one-way only, which is acceptable — client→server is just the
  `/api/track` POST; `NOTIFY` payload limits mean we send a thin id and let
  clients read the row.

---

## ADR-0007 — geoip-lite offline geo lookup

**Status:** Accepted

### Context
Every event derives `country`, `country_code`, `region`, `city`, `latitude`, and
`longitude` from the IP, server-side on ingest, feeding the world map (spec §5).
This sits on the hot `/api/track` path, and the whole app must run from a clean
`pnpm install && … && pnpm dev` with no external accounts (spec §13).

### Decision
Use **geoip-lite** — a bundled, MaxMind-derived offline database with synchronous,
in-process lookups and no API key.

### Alternatives considered
- **Paid geo API (MaxMind GeoIP2 service / ipinfo / ipstack)** — most accurate and
  always fresh, but adds per-lookup latency and a network failure mode on the
  ingest path, plus a key, cost, and rate limits; a self-contained assignment
  shouldn't require an account to run.
- **MaxMind GeoLite2 + a reader (`maxmind` npm)** — more accurate and updatable,
  but downloading the `.mmdb` needs a MaxMind license key and a build step —
  friction against zero-config reproducibility.
- **IP2Location Lite** — same class of extra download/licensing step.

### Consequences
- **Good:** zero-config, no key, works offline and in CI; synchronous in-process
  lookup adds no latency or failure mode to `/api/track`; reproducible; free.
- **Bad:** coarser and staler than a paid service (city-level is approximate; the
  snapshot ages between package bumps); ships a multi-MB dataset in
  `node_modules`; weaker IPv6 coverage.
- **Neutral:** accuracy is more than enough for a density-shaded country map and
  the demo; the ingest seam lets us swap in a paid provider later if precision
  ever matters.

---

## ADR-0008 — TanStack Table + Virtual for the activity table

**Status:** Accepted

### Context
The activity table needs sort, filter, search, pagination, a new-row highlight on
live insert, and smooth scrolling as rows accumulate — all under the bespoke
monochrome + glass styling (spec §9). It renders the same event shape shown in the
live feed and must stay accessible (semantic table, keyboard nav — spec §10).

### Decision
Use **TanStack Table** (headless) for table logic — column model, sorting,
filtering, pagination — and **TanStack Virtual** for row virtualization.

### Alternatives considered
- **AG Grid** — enterprise-grade with everything built in, but a heavy bundle, its
  own styling system to override for monochrome/glass, and licensing tiers for
  advanced features. More than we need.
- **MUI DataGrid / other styled grids** — quick start, but bring a design language
  that fights the custom monochrome + glass system; theming friction.
- **Hand-rolled `<table>` + manual sort/filter/windowing** — full control, but
  re-implements virtualization and column/sort/filter state — the fiddly,
  bug-prone code TanStack has already solved.
- **react-window / react-virtualized alone** — solves virtualization but not the
  table model; we'd still hand-build sort/filter/columns.

### Consequences
- **Good:** headless means we own all markup and styles — ideal for monochrome +
  glass and a semantic, accessible table; Table and Virtual share an author and
  compose cleanly; we ship only the features used; scales smoothly with the live
  feed.
- **Bad:** headless means more presentational code than a batteries-included grid;
  virtualization complicates accessibility (managing focus, `aria-rowcount`) and
  the new-row highlight inside a virtualized window; sticky header over a virtual
  body needs care.
- **Neutral:** sort/filter/pagination state is ours to wire to `/api/events` query
  params.

---

## ADR-0009 — Seed 20 demo users + real capture (hybrid data strategy)

**Status:** Accepted

### Context
Two requirements pull in opposite directions: the dashboard must look rich on
first load and never show an empty state (spec §2), yet Beacon must be a real
full-stack app that captures real visits — including the reviewer's own, live
(spec §1). The demo needs instant density *and* a genuine "my visit just appeared"
moment.

### Decision
Ship an **idempotent seed** of 20 demo users plus ~800–1,200 events over the last
30 days — spread across ~12–15 countries with a realistic device/browser/OS and
referrer mix and a believable daily rhythm (spec §6). **Real captured events append
on top.** `pnpm seed` is re-runnable and never wipes real data unless `--reset` is
passed.

### Alternatives considered
- **Pure-mock (fixtures, no real capture)** — always looks perfect and carries no
  backend risk, but it's a mockup: it fails the "real capture" requirement and
  kills the live-visit signature moment (spec §1, §2).
- **Empty-real (real capture only, no seed)** — honest, but first load is an empty
  dashboard — no map density, no time-series, no KPI deltas until traffic exists;
  a poor demo and first impression (spec §2, "never an empty state").
- **Generate-on-boot / synthetic traffic bot** — keeps things lively without a
  seed, but adds a background process, blurs real vs. fake, and is
  non-deterministic for review.

### Consequences
- **Good:** rich, believable dashboard on first `pnpm seed` (map variance,
  time-series rhythm, KPI deltas); still a genuine capture pipeline (real visits
  appended); idempotent + `--reset` keeps it reproducible for reviewers (spec §13).
- **Bad:** seeded rows must be realistic enough not to look fake (careful geo/
  device/time distributions); seeded and real rows share one table and must be
  visually indistinguishable yet safe to reset without nuking real captures; the
  generator is extra code to maintain.
- **Neutral:** KPIs and aggregates intentionally blend seeded + real data; the
  `--reset` flag and seed-vs-real provenance need a little bookkeeping.

---

## ADR-0010 — pnpm + TypeScript strict tooling baseline

**Status:** Accepted

### Context
The codebase must be reproducible, cleanly typed, and read as senior-level (spec
§2, §13), running on Node 20+. The spec pins exact commands — `pnpm install`,
`pnpm db:push`, `pnpm seed`, `pnpm dev` — so the package manager is part of the
contract. It is a single package today but could grow into workspaces.

### Decision
Use **pnpm** as the package manager and **TypeScript in `strict` mode** across the
app. `pnpm-lock.yaml` is the committed lockfile.

### Alternatives considered
- **npm** — universal and default, but slower installs and a flat `node_modules`
  that permits phantom (undeclared) dependencies. pnpm's content-addressed store
  is faster, and its strict symlinked layout blocks phantom deps — cleaner for a
  reviewer's fresh install.
- **Yarn (Classic / Berry)** — Classic is legacy; Berry's PnP is powerful but has
  ecosystem-compat sharp edges (some tools still need the node-modules linker).
  pnpm gives most of the speed and strictness with less configuration risk.
- **TypeScript non-strict / loose** — less up-front friction, but forfeits the
  null/undefined and unsound-assignment checks that catch a whole class of 3am
  bugs; the typed stack (Drizzle, TanStack, Auth.js) pays off best under strict.
- **JS + JSDoc** — no build-time type step, but loses inference across the typed
  stack; not a serious option here.

### Consequences
- **Good:** fast, disk-efficient, deterministic installs; strict `node_modules`
  blocks phantom deps; TS strict surfaces type errors before runtime and powers
  editor DX across Drizzle/TanStack/Auth.js; matches the spec's exact commands.
- **Bad:** reviewers need pnpm available (an extra `corepack enable` vs. npm);
  strict mode adds annotation friction and can be noisy around some third-party
  types (occasional guards or `as`).
- **Neutral:** single-package today, ready to become a workspace monorepo if ever
  split — but not scaffolded ahead of need (YAGNI).
