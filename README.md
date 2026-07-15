# Beacon

**A real-time, monochrome, liquid-glass visitor-activity analytics dashboard — a dashboard that watches itself.**

Beacon's own public pages are the tracked property: every visit becomes an event. Signed-in users open the dashboard and see the full live stream of activity — who visited, from where, on what device — as KPI tiles, a world map, charts, and a live activity table. Anonymous visitors are recorded by public IP; signed-in users by identity.

> **Status: design & planning complete.** The `docs/` suite below is the full, approved design. Implementation follows `docs/07-implementation-plan.md` task-by-task (TDD). No application code has been written yet.

---

## Documentation suite

| # | Doc | What's in it |
|---|-----|--------------|
| 00 | [Product & Design Spec](docs/00-product-spec.md) | **Source of truth** — concept, scope, data, canonical names |
| 01 | [System Architecture](docs/01-system-architecture.md) | Components, flows (Mermaid), repo tree, real-time, config |
| 02 | [Data Model](docs/02-data-model.md) | ERD, Drizzle schema, indexes, KPI SQL, seed spec |
| 03 | [API Design](docs/03-api-design.md) | Every endpoint: zod schemas, responses, errors, SSE |
| 04 | [UI/UX Spec](docs/04-ui-ux-spec.md) | Monochrome tokens, liquid-glass recipes, components, motion, a11y |
| 05 | [Privacy & Security](docs/05-privacy-security.md) | PII, consent, IP handling, threat model, hardening |
| 06 | [ADRs](docs/06-adrs.md) | 10 architecture decision records with alternatives |
| 07 | [Implementation Plan](docs/07-implementation-plan.md) | 47 TDD tasks across 9 phases |

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · PostgreSQL 16 · Drizzle ORM · Auth.js v5 (Credentials + Google) · Recharts · react-simple-maps · TanStack Table/Virtual · Framer Motion · ua-parser-js · geoip-lite · zod · bcrypt · pnpm.

## Design highlights

- **Monochrome black & white** — no color accent; chart series separated by opacity, stroke, texture, and direct labels.
- **Liquid-glass** header, tiles, and sidebar; **dark/light** toggle (both themes fully designed).
- **Real full-stack** — real Postgres, real IP/geo/device capture, real auth. Seeded with **20 demo users** so it's rich on first load.
- **Real-time** live feed via Postgres `LISTEN/NOTIFY` → SSE (polling fallback).
- **Accessible** (WCAG 2.2 AA) and **motion-safe** (`prefers-reduced-motion`).

## Quickstart (target workflow, once implemented per `docs/07`)

```bash
pnpm install
cp .env.example .env        # fill in the values below
pnpm db:push               # apply Drizzle schema
pnpm seed                  # 20 demo users + activity
pnpm dev                   # http://localhost:3000
```

## Environment variables

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js session secret |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials |
| `IP_SALT` | Salt for hashing visitor IPs |
| `TRUSTED_PROXY_HOPS` | Trusted proxy count for `x-forwarded-for` (default `1`) |
| `IP_STORAGE_MODE` | `hashed` (default) or `raw` |

## Privacy

Beacon records IP addresses (PII). It ships with a transparent consent notice, stores **hashed** IPs by default, rate-limits and bot-filters ingest, and documents retention. See [docs/05-privacy-security.md](docs/05-privacy-security.md).
