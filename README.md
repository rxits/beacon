# Beacon

**A real-time, monochrome, liquid-glass visitor-analytics dashboard — a dashboard that watches itself.**

Beacon's own pages are the tracked property: every visit becomes a live event. Signed-in users open the dashboard and watch the stream — who visited, from where, on what device — as KPI tiles, a world map, charts, and a live activity table. Anonymous visitors are recorded by hashed IP; signed-in users by identity.

Built with **Next.js 16 (App Router) · TypeScript · Postgres · Drizzle · Auth.js v5**, in a strict **black-and-white** design system with liquid glass, dark/light themes, and reduced-motion support.

---

## Run locally

Prerequisites: Node 20+, pnpm, Docker (for Postgres).

```bash
# 1. Start Postgres
docker run -d --name beacon-pg \
  -e POSTGRES_USER=beacon -e POSTGRES_PASSWORD=beacon -e POSTGRES_DB=beacon \
  -p 5432:5432 postgres:16

# 2. Install deps + env (defaults already point at the Docker DB)
pnpm install
cp .env.example .env

# 3. Create the schema and seed 20 demo users + ~1000 events
pnpm db:push
pnpm seed

# 4. Run
pnpm dev          # → http://localhost:3000
```

**Demo login:** `demo@beacon.local` / `demo1234`

> **If your shell blocks pnpm's post-install build approval** (`ERR_PNPM_IGNORED_BUILDS`), either run `pnpm approve-builds` once, or call the binaries directly — they always work:
> `./node_modules/.bin/next dev` · `./node_modules/.bin/tsx scripts/seed.ts` · `./node_modules/.bin/drizzle-kit push` · `./node_modules/.bin/vitest run`

```bash
pnpm test          # unit tests (IP derivation, hashing, UA/bot parsing)
pnpm build         # production build
```

## What's built

- **Auth** — email + password (bcrypt) via Auth.js v5; "Continue with Google" appears automatically if `AUTH_GOOGLE_ID/SECRET` are set. Guarded `/dashboard/*` routes.
- **Ingest** — a client beacon posts every visit to `POST /api/track`; the server derives the real IP (trusted right-most `x-forwarded-for`), geo, and device, rate-limits and bot-filters, and stores a **salted hash** of the IP by default (never the raw IP).
- **Dashboard** — sidebar + liquid-glass header, dark/light toggle, `24h/7d/30d` range. KPI tiles (visits, uniques, signed-in %, live now, top country), a gradient visits chart (visits vs uniques), a monochrome density **world map**, device/referrer breakdown, and a **live activity table** (filter, search, paginate, new-row highlight).
- **Pages** — Overview, Activity, Users, Map, Settings.

## Documentation

Full design lives in [`docs/`](docs/): [product spec](docs/00-product-spec.md), [architecture](docs/01-system-architecture.md), [data model](docs/02-data-model.md), [API](docs/03-api-design.md), [UI/UX](docs/04-ui-ux-spec.md), [privacy & security](docs/05-privacy-security.md), [ADRs](docs/06-adrs.md), and the [implementation plan](docs/07-implementation-plan.md).

## Notes / deliberate decisions

- **Live feed via polling** (4s) rather than SSE — simpler, same effect for a localhost demo; SSE is the documented upgrade path.
- **Geo** uses `geoip-lite` when its (licensed) country DB is present and degrades gracefully to "unknown" otherwise. On localhost all visitors are private-IP, so the map is populated by the seeded data; real public visits resolve in production.
- **IP is hashed by default** (`IP_STORAGE_MODE=hashed`); raw IPs are never serialized to the client.
- Seeded with **20 demo users**; real visits (including yours) are captured and appended on top.

## Environment variables

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js session secret |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional Google OAuth |
| `IP_SALT` | Salt for hashing visitor IPs |
| `TRUSTED_PROXY_HOPS` | Trusted proxy count for `x-forwarded-for` (default `1`) |
| `IP_STORAGE_MODE` | `hashed` (default) or `raw` |
