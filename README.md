# Beacon

> **Hiring assignment** — designed & built by **Rakshit (rxit)** for **[e42.ai](https://e42.ai)**.

**A real-time visitor-analytics dashboard that watches itself.** Beacon's own pages are the tracked property: every visit becomes a live event — who, from where, on what device — surfaced as KPI tiles, an interactive world map, colored charts, and a streaming activity feed. Anonymous visitors are recorded by public IP; signed-in users by identity.

![Beacon — live demo](docs/media/demo.gif)

*Full walkthrough: login, live dashboard, dark/light toggle, click-through activity details, map, and settings. ([download MP4](docs/media/demo.mp4))*

Built with **Next.js 16 (App Router) · TypeScript · PostgreSQL · Drizzle · Auth.js v5**, in a custom glass design system with dark/light themes and reduced-motion support.

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

**Demo login:** `demo@beacon.local` / `demo1234` · or click **Continue as guest**.

```bash
pnpm test          # unit tests (IP derivation, hashing, UA/bot parsing)
pnpm build         # production build
```

> If your shell blocks pnpm's post-install build approval (`ERR_PNPM_IGNORED_BUILDS`), run `pnpm approve-builds` once, or call binaries directly: `./node_modules/.bin/next dev`, `./node_modules/.bin/tsx scripts/seed.ts`, `./node_modules/.bin/drizzle-kit push`.

## Features

- **Authentication** — email + password (bcrypt), **Continue as guest**, and "Continue with Google" (auto-enabled when `AUTH_GOOGLE_ID/SECRET` are set). Editable profile (name / password) in Settings. Guarded `/dashboard/*` routes.
- **Real activity capture** — a client beacon posts every visit to `POST /api/track`; the server derives the real IP (trusted right-most `x-forwarded-for`), geo, and device, rate-limits and bot-filters, and stores a salted IP hash alongside the raw IP.
- **Dashboard** — sidebar + glass header, dark/light toggle, `24h/7d/30d` range. KPI tiles (visits, uniques, signed-in %, live now, top country) with count-ups and sparklines; a colored visits chart (visits vs uniques); an **interactive world map** of visit density; device/referrer breakdown; and a **live activity table** — filter, search, paginate, new-row highlight, and **click any row for full details** (identity, IP, location, device, session).
- **Pages** — Overview, Activity, Users, Map, Settings.

## How visitor IP is captured

- **Public IP** — the reliable, routable address of the network the visitor is on. Read server-side from `x-forwarded-for` in production; on localhost (where the server only sees `127.0.0.1`) the client resolves it via a free lookup and the server accepts it only as a fallback.
- **Private / LAN IP** — attempted best-effort via WebRTC. Modern browsers deliberately mask this behind an `.local` mDNS placeholder, so it's shown honestly as *"Hidden by browser"* when unavailable. No web page can reliably obtain a device's LAN IP by design.

## Security

- **HTTP headers** (`next.config.ts`) — Content-Security-Policy (self-only + `ipwho.is`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- **Rate limiting** — per-IP token buckets on `/api/track` and on login / signup / guest actions (brute-force resistance).
- **Input validation** — every request body and query string is validated with **zod** (`/api/track`, `/api/events`, auth actions); enums are whitelisted and numbers clamped.
- **Injection-safe** — all DB access goes through Drizzle's parameterized queries; no string-built SQL.
- **Secrets** — kept in `.env` (git-ignored); only `.env.example` with placeholders is committed. Generate a real secret with `openssl rand -base64 33` → `AUTH_SECRET`.
- **PII** — IPs are stored with a salted SHA-256 hash; passwords hashed with bcrypt (cost 12); Auth.js provides CSRF-protected sessions. Full threat model in [`docs/05-privacy-security.md`](docs/05-privacy-security.md).

## Documentation

Full design in [`docs/`](docs/): [product spec](docs/00-product-spec.md), [architecture](docs/01-system-architecture.md), [data model](docs/02-data-model.md), [API](docs/03-api-design.md), [UI/UX](docs/04-ui-ux-spec.md), [privacy & security](docs/05-privacy-security.md), [ADRs](docs/06-adrs.md), and the [implementation plan](docs/07-implementation-plan.md).

## Tech stack

Next.js 16 · React 19 · TypeScript (strict) · Tailwind CSS v4 · PostgreSQL 16 · Drizzle ORM · Auth.js v5 · Recharts · react-simple-maps (world map) · TanStack Table · Framer Motion · ua-parser-js · geoip-lite · zod · bcryptjs · pnpm.

## Environment variables

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js session secret (`openssl rand -base64 33`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional Google OAuth |
| `IP_SALT` | Salt for hashing visitor IPs |
| `TRUSTED_PROXY_HOPS` | Trusted proxy count for `x-forwarded-for` (default `1`) |
| `IP_STORAGE_MODE` | `raw` (default here) or `hashed` |

## Notes / deliberate decisions

- Live feed via **polling** (4s) rather than SSE — simpler, same effect for a localhost demo; SSE is the documented upgrade path.
- **Geo** uses `geoip-lite` when its country DB is present and degrades gracefully otherwise; on localhost the seeded data drives the map while real public visits resolve live.
- Seeded with **20 demo users** so the dashboard is rich on first load; real visits (including yours) are captured and appended.

---

## About

This project is a **hiring assignment** created by **Rakshit (rxit)** for **[e42.ai](https://e42.ai)**. It demonstrates end-to-end product engineering — real-time data capture, a considered schema, authentication, privacy & security handling, and an original, polished UI — from a written design spec through to a working, tested, production-building app.
