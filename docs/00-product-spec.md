# Beacon — Product & Design Spec

> Master source of truth. Every other doc in `docs/` elaborates on this and MUST
> use the canonical names in §12. If something here is wrong, fix it here first.

**Status:** approved design (brainstorming complete) · **Date:** 2026-07-16
**Type:** hiring-assignment deliverable — a modern visitor-activity analytics dashboard.

---

## 1. Overview

Beacon is a **real-time visitor-activity analytics dashboard that watches itself**.
The app's own public pages are the tracked property: every visit becomes an event.
Authenticated users open the dashboard and see the full stream of activity — who
visited, from where, on what device — as KPI tiles, a world map, charts, and a
live activity table.

The signature moment: an interviewer opens the app → their visit appears in the
live feed within a second as *"Anonymous · <city> · Chrome on macOS · just now."*
They sign in → that same session flips from a bare IP to their name + avatar.

The database ships **seeded with 20 demo users and their activity**, so the
dashboard is rich on first load (never an empty state). Real visits are still
captured and appended on top — this is a real full-stack app, not a mockup.

## 2. Goals & non-goals

**Goals**
- Beautiful, modern, **black-and-white** dashboard that reads as senior-level craft.
- Real full-stack: real auth, real Postgres, real IP/geo/device capture.
- The three required surfaces done excellently: **KPI tiles, list/table view, 2–3 graphs.**
- Record visitor activity; identified user when signed in, else public IP (assignment requirement).
- Deployable, reproducible, documented.

**Non-goals (YAGNI — explicitly out of scope)**
- Multi-tenant orgs, teams, or per-user data silos (one shared admin-style view).
- Role/permission management beyond "authenticated = can view dashboard".
- Billing, alerting/notifications engine, data export, email digests.
- Native mobile app (the web app is responsive; that's enough).
- A/B testing, funnels, retention cohorts, or any analytics feature beyond what §9 lists.

## 3. Users & roles

- **Anonymous visitor** — lands on the public login/signup page. Recorded by **public IP** (+ geo, device). Cannot see the dashboard.
- **Authenticated user** — signed in via email+password or Google. Sees the **full dashboard of all activity** (admin-style overview; not siloed to their own events). Their own activity is attributed to their identity.

Single role. Any authenticated user sees everything. No admin/user tiering.

## 4. Authentication

- **Auth.js (NextAuth v5)** with a Drizzle Postgres adapter (DB sessions).
- **Credentials provider** — email + password. Passwords hashed with **bcrypt** (cost 12). Signup validates with zod (email format, password ≥ 8 chars).
- **Google OAuth provider** — "Continue with Google".
- Login and signup are one styled surface with two modes (tab/toggle).
- Middleware guards `/dashboard/*`; unauthenticated → redirect to `/login`.

## 5. Activity captured per event

Server-derived on ingest (never trust the client for IP/geo):

| Field | Source | Notes |
|---|---|---|
| `id` | db | uuid |
| `session_id` | cookie | anonymous session correlation |
| `user_id` | auth | nullable — null = anonymous |
| `ip` | request headers | real public IP = **trusted right-most** `x-forwarded-for` entry (n-th from right per `TRUSTED_PROXY_HOPS`, default 1); the left-most is client-spoofable |
| `ip_hash` | derived | sha256(ip + salt); used where raw IP not needed |
| `country`, `country_code`, `region`, `city` | geoip-lite(ip) | offline lookup, no API key |
| `latitude`, `longitude` | geoip-lite(ip) | for the world map |
| `browser`, `os`, `device_type` | ua-parser-js(user-agent) | e.g. Chrome / macOS / desktop |
| `path` | client beacon | page path visited |
| `referrer` | client beacon / header | traffic source |
| `event_type` | client beacon | `page_view` \| `login` \| `signup` \| `click` |
| `created_at` | db | timestamptz, default now() |

## 6. Demo data (seed)

- **20 demo users** — realistic names, emails, avatars, mixed signup dates.
- **~800–1,200 events** over the last **30 days**, distributed so every surface is full:
  - spread across **~12–15 countries** (world map has density variance),
  - realistic **device/browser/OS** mix, several **referrers** (direct, Google, LinkedIn, GitHub, X),
  - a believable daily rhythm (day/night, weekday/weekend) for the time-series chart.
- Seed is **idempotent** and re-runnable (`pnpm seed`). Real captured events append; seed never wipes real data unless `--reset`.

## 7. Tech stack

- **Next.js 15 (App Router) + React 19 + TypeScript** — RSC for dashboard reads, route handlers for ingest.
- **Tailwind CSS v4** for styling; design tokens as CSS variables (see UI/UX spec).
- **PostgreSQL 16 + Drizzle ORM** (type-safe schema + migrations). Prisma is the noted alternative.
- **Auth.js v5** (Credentials + Google).
- **Recharts** — time-series + breakdown charts. **react-simple-maps** — world map.
- **TanStack Table + TanStack Virtual** — activity table (sort/filter/virtualized).
- **Framer Motion** — animation (reduced-motion aware).
- **ua-parser-js** (device), **geoip-lite** (geo), **zod** (validation), **bcrypt** (hashing).
- **Fonts:** Geist (UI) + Geist Mono (numbers/data). **pnpm**, Node 20+.
- **Env vars** (Auth.js v5 naming): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `IP_SALT`, `TRUSTED_PROXY_HOPS` (default 1), `IP_STORAGE_MODE` (default `hashed`).

## 8. App structure & routes

```
/                     → redirect: authed → /dashboard, else → /login
/login                → login/signup surface (public, IP recorded)
/signup               → same surface, signup mode
/dashboard            → Overview (tiles + map + charts + recent activity)
/dashboard/activity   → full activity table (filters, search, pagination)
/dashboard/users      → the 20 users + signups, last seen, event counts
/dashboard/map        → full-screen world map view
/dashboard/settings   → theme, privacy (IP handling), account
/api/auth/*           → Auth.js
/api/track            → POST ingest (beacon)
/api/events           → GET list (paginated, filterable)
/api/stats            → GET KPI aggregates
/api/stream           → GET SSE live feed (fallback: client polls /api/events)
```

## 9. Dashboard surface (the three required things, done well)

**KPI tiles** (top row) — each: big count-up number, mono type, sparkline, delta vs prev period, glass surface:
- `total_visits` (today / all-time toggle)
- `unique_visitors`
- `signed_in_ratio` (signed-in vs anonymous)
- `live_now` (active sessions, last 5 min)
- `top_country`

**Graphs (3)** — grayscale, series separated by opacity/line-style/texture/labels (not color):
1. **Visits over time** — area/line, 24h / 7d / 30d range toggle, gradient fill.
2. **World map** — `react-simple-maps`, country fill shaded by visit density + hover tooltip.
3. **Device & referrer breakdown** — donut (device) + top-referrers bars.

**Activity table** (`/dashboard/activity`, plus a compact "recent" block on Overview) — TanStack Table:
- columns: time (relative) · who (avatar+name or "Anonymous"+IP) · location (flag+city) · device · path · referrer
- search, filters (signed-in/anon, country, device, event type), sort, pagination, **new-row highlight** on live insert, virtualized rows.

**Shell**
- **Left sidebar** — logo, collapsible nav: Overview · Activity · Users · Map · Settings; footer = signed-in user chip.
- **Header** (liquid glass) — global search, date-range selector, live "connected" pulse, **dark/light toggle**, notifications bell, profile menu (logout).

## 10. Visual & UX direction

- **Monochrome black & white.** Pure black / white / calibrated grays. **No color accent.** High-contrast, editorial. Charts differentiate series via opacity, stroke style, texture, and direct labels.
- **Liquid glass** on header, tiles, modals, sidebar — layered `backdrop-blur`, thin light borders, inner/outer glow, specular sheen.
- **Dark-first + light toggle**, persisted, no flash on load. Both themes fully designed.
- **Motion** (Framer Motion) — number count-ups, chart draw-in, row-insert slide, subtle animated grain/gradient-mesh background, magnetic hover, route transitions. **All gated behind `prefers-reduced-motion`.**
- **Type** — Geist for UI, Geist Mono for figures.
- **Accessibility** — WCAG 2.2 AA: keyboard nav, visible focus, semantic landmarks, labelled controls, AA contrast (easy in monochrome), reduced-motion. Non-negotiable.
- **Responsive** — sidebar collapses to a drawer on mobile; tiles/charts reflow.
- **Skills to apply during build:** `ui-ux-pro-max` (login + shell — explicit user request), `dataviz` (monochrome charts), `liquid-glass-design`, `motion`, `frontend-a11y`.

## 11. Privacy & security (the differentiator)

- Transparent **consent/notice banner**: "This visit is being recorded (IP, device, location)."
- **IP handling** setting: store raw vs. store only `ip_hash` (truncate/hash option). Default documented.
- **Rate limiting** + basic **bot filtering** on `/api/track` (drop obvious crawlers, cap per-IP/min).
- zod validation on all inputs; parameterized queries via Drizzle (no injection); secrets in env; Auth.js CSRF built-in.
- Full threat model lives in `05-privacy-security.md`.

## 12. Canonical names — DO NOT DEVIATE

- **Project:** Beacon
- **Routes:** exactly as §8.
- **API endpoints:** `/api/track`, `/api/events`, `/api/stats`, `/api/stream`, `/api/auth/*`.
- **DB tables:** `users`, `accounts`, `sessions`, `verification_tokens` (Auth.js), `events` (activity).
- **`events` columns:** as §5 field names.
- **KPI keys:** `total_visits`, `unique_visitors`, `signed_in_ratio`, `live_now`, `top_country`.
- **React components:** `AppShell`, `Sidebar`, `Header`, `ThemeToggle`, `GlassPanel`, `KpiTile`, `VisitsChart`, `WorldMap`, `BreakdownChart`, `ActivityTable`, `ConsentBanner`.
- **Event types:** `page_view`, `login`, `signup`, `click`.

## 13. Success criteria

- Fresh `pnpm install && pnpm db:push && pnpm seed && pnpm dev` yields a full, animated, populated dashboard.
- Login/signup works (email+password and Google); guarded routes redirect.
- A real visit is captured with correct IP/geo/device and appears in the table/live feed.
- All three required surfaces (tiles, table, ≥2 graphs incl. world map) present and polished.
- Dark/light both flawless; liquid-glass header; monochrome charts legible; reduced-motion respected; keyboard-navigable.
- Docs suite complete; code clean and typed.
