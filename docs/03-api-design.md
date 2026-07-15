# Beacon — API Design

> Elaborates on `00-product-spec.md`. Canonical names come from spec §12; event
> fields from spec §5. This document adds **no endpoints** beyond the five groups
> in spec §8/§12: `/api/track`, `/api/events`, `/api/stats`, `/api/stream`,
> `/api/auth/*`. If anything here contradicts the product spec, the spec wins.

**Status:** design · **Date:** 2026-07-16 · **Runtime:** Next.js 15 App Router
route handlers (`app/api/**/route.ts`), Node runtime (geoip-lite + bcrypt need
it — not Edge).

---

## 1. Conventions

### 1.1 Base + transport
- **Base URL:** same-origin, `/api/*`. No cross-origin access; the beacon fires
  from Beacon's own pages, so **CORS is same-origin only** (no `Access-Control-*`).
- **Content types:** requests and responses are `application/json; charset=utf-8`,
  except `/api/stream` (`text/event-stream`) and the redirecting `/api/auth/*`
  routes.
- **Caching:** every API response sends `Cache-Control: no-store`. Analytics data
  is live; nothing here is cacheable.
- **Time:** all timestamps are ISO-8601 UTC strings (`2026-07-16T09:00:01.123Z`).
  All bucketing/`date_trunc` is UTC.
- **IDs:** UUID v4 strings.
- **Validation:** every request body/query is parsed with a **zod** schema at the
  trust boundary. A parse failure is a `400 bad_request` with field `details`.
  DB access is exclusively through Drizzle parameterized queries (no string SQL).

### 1.2 Auth model
| Group | Auth |
|---|---|
| `POST /api/track` | **Public.** Anonymous visitors are the point; no session required. |
| `GET /api/events` | **Session required** (any authenticated user). |
| `GET /api/stats` | **Session required.** |
| `GET /api/stream` | **Session required** (cookie-based; see §5). |
| `/api/auth/*` | **Public** (this is how you obtain a session). |

Session is the Auth.js DB session cookie
(`__Secure-authjs.session-token` in prod, `authjs.session-token` in dev), read
server-side via the `auth()` helper. Missing/expired session on a guarded route →
`401 unauthorized` envelope. There is a single role (spec §3): authenticated =
full dashboard. No per-user data siloing, so no `403` for ownership.

### 1.3 Error envelope
Every non-2xx JSON response (and the redirect-based Auth.js errors excepted) uses:

```ts
interface ErrorResponse {
  error: {
    code:
      | "bad_request"     // 400 — zod/validation, malformed cursor
      | "unauthorized"    // 401 — no/invalid session
      | "forbidden"       // 403 — CSRF failure (Auth.js)
      | "not_found"       // 404
      | "rate_limited"    // 429
      | "internal";       // 500 — unexpected
    message: string;                                   // human-readable, safe to log
    details?: Array<{ path: string; message: string }>; // zod field errors, 400 only
  };
}
```

Example:
```json
{ "error": { "code": "bad_request", "message": "Invalid query parameters",
  "details": [{ "path": "limit", "message": "Number must be <= 100" }] } }
```

### 1.4 Status codes (matrix)
| Endpoint | 2xx | 302 | 400 | 401 | 403 | 429 | 500 |
|---|---|---|---|---|---|---|---|
| `POST /api/track` | 202 | – | ✓ | – | – | ✓ | ✓ |
| `GET /api/events` | 200 | – | ✓ | ✓ | – | – | ✓ |
| `GET /api/stats` | 200 | – | ✓ | ✓ | – | – | ✓ |
| `GET /api/stream` | 200¹ | – | ✓ | ✓ | – | ✓² | ✓ |
| `/api/auth/*` | 200 | ✓³ | ✓ | ✓⁴ | ✓ | – | ✓ |

¹ long-lived `text/event-stream`. ² optional per-IP concurrent-connection cap.
³ `signin`/`callback`/`signout` redirect. ⁴ bad credentials surface as an Auth.js
error redirect, not a bare 401 (§6).

### 1.5 Rate-limit headers
`POST /api/track` always returns rate-limit headers; other endpoints may. IETF
draft names are canonical, `X-RateLimit-*` sent as aliases for older clients:

```
RateLimit-Limit: 30          # bucket capacity (also X-RateLimit-Limit)
RateLimit-Remaining: 12      # tokens left (also X-RateLimit-Remaining)
RateLimit-Reset: 8           # seconds until +1 token / window reset (also X-RateLimit-Reset)
Retry-After: 8               # 429 only — seconds to wait
```

### 1.6 Non-endpoints (server actions, not `/api/*`)
Login and **signup** are **Next.js Server Actions**, deliberately *not* new REST
endpoints (spec §12 forbids inventing endpoints):
- **Login** → server action calls Auth.js `signIn("credentials", …)` /
  `signIn("google")`, which post to the canonical `/api/auth/*` routes.
- **Signup** → server action `signUp()`: zod-validate, `bcrypt.hash(pw, 12)`,
  insert `users` row, then `signIn("credentials", …)`. Detailed in §6.4.

---

## 2. Shared response types

Used by `/api/events` (`items[]`) **and** `/api/stream` (`data:` payload) — one
DTO, so the client's row-render + new-row-highlight logic is shared across the
live and paged paths.

```ts
type Identity   = "signed_in" | "anonymous";
type DeviceType = "desktop" | "mobile" | "tablet";
type EventType  = "page_view" | "login" | "signup" | "click";

// 1:1 with the `events` table (spec §5); flat columns grouped for ergonomics.
// Column names are preserved verbatim inside each group.
interface EventDTO {
  id: string;                 // events.id
  created_at: string;         // events.created_at (ISO)
  event_type: EventType;      // events.event_type
  identity: Identity;         // derived: user_id === null ? "anonymous" : "signed_in"
  user: { id: string; name: string; image: string | null } | null; // join users on user_id
  session_id: string;         // events.session_id
  ip_hash: string;            // events.ip_hash — RAW events.ip is NEVER serialized to clients
  location: {
    country: string | null;        // events.country
    country_code: string | null;   // events.country_code (ISO-3166 alpha-2)
    region: string | null;         // events.region
    city: string | null;           // events.city
    latitude: number | null;       // events.latitude
    longitude: number | null;      // events.longitude
  };
  device: {
    browser: string | null;        // events.browser
    os: string | null;             // events.os
    device_type: DeviceType;       // events.device_type
  };
  path: string;               // events.path
  referrer: string | null;    // events.referrer
}
```

**Privacy invariant:** `events.ip` (raw) is stored per the privacy setting (spec
§11) but is **never** placed in any API response. Clients only ever see
`ip_hash`. This holds for `/api/events`, `/api/stream`, and everything else.

---

## 3. `POST /api/track` — beacon ingest

Public write endpoint. The client sends only what it legitimately knows (path,
referrer, event type, a session hint); the server derives everything
identity/geo/device-related. **Client IP and geo are never trusted.** Designed
for `navigator.sendBeacon()` (fire-and-forget; response body is ignored by the
caller, so it is intentionally tiny).

- **Method / path:** `POST /api/track`
- **Auth:** none. Anonymous visits on `/login` are exactly the traffic we want.
- **CSRF:** exempt by design — it authenticates nothing and only appends
  anonymous telemetry. It is protected instead by bot filtering + per-IP rate
  limiting + zod bounds (§3.3–3.4).

### 3.1 Request

**Headers (server reads, client cannot spoof into the record):**
| Header | Use |
|---|---|
| `x-forwarded-for` | **first hop** = real public IP → `ip`, then geo + `ip_hash`. |
| `user-agent` | `ua-parser-js` → `browser`, `os`, `device_type`. |
| `referer` | fallback for `referrer` if body omits it. |
| `cookie: bcn_sid` | authoritative anonymous `session_id` (httpOnly, set by server if absent). |
| `content-type: application/json` | required. |

**Body (zod):**
```ts
import { z } from "zod";

export const trackBody = z.object({
  path: z.string().min(1).max(2048).startsWith("/"),          // e.g. "/login"
  referrer: z.string().max(2048).optional().default(""),       // client-observed; header is fallback
  event_type: z.enum(["page_view", "login", "signup", "click"]).default("page_view"),
  session_hint: z.string().uuid().optional(),                  // client's cached sid; advisory only
});
export type TrackBody = z.infer<typeof trackBody>;
```

`session_hint` is **advisory**. The server trusts the httpOnly `bcn_sid` cookie;
if that cookie is absent it mints a new UUID, sets the cookie
(`Set-Cookie: bcn_sid=…; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=…`), and
uses it. The client hint never overrides an existing server cookie.

### 3.2 Server-side derivation (spec §5)
1. `ip = firstHop(x-forwarded-for)` — split on `,`, take `[0]`, trim. Fall back to
   the socket address. If it is private/loopback/malformed → treat as unknown
   (skip geo, still record).
2. `ip_hash = sha256(ip + IP_HASH_SALT)` (salt from env).
3. `{ country, country_code, region, city, latitude, longitude } = geoip.lookup(ip)`
   (geoip-lite, offline, no API key; nulls when not found).
4. `{ browser, os, device_type } = uaParser(user-agent)`; `device_type` normalized
   to `desktop | mobile | tablet` (ua-parser's `console/smarttv/wearable/embedded`
   and empty → `desktop`).
5. `user_id` = current session user id via `auth()`, else `null` → sets `identity`.
6. `session_id` = `bcn_sid` cookie (§3.1).
7. Persist raw `ip` per the privacy setting (spec §11: raw vs hash-only; default
   documented in `05-privacy-security.md`). `ip_hash` always stored.

### 3.3 Bot filtering
Before insert, drop obvious non-humans (spec §11):
- **No / empty `user-agent`** → drop.
- UA matches bot regex (case-insensitive):
  `/bot|crawl|spider|slurp|bingpreview|headless|phantom|puppeteer|playwright|curl|wget|python-requests|axios|go-http|facebookexternalhit|embedly|preview|monitor|uptime|pingdom|lighthouse/`.

Dropped requests still return **`202`** (same as accepted) and are simply **not
persisted** — crawlers get no signal that they were filtered, and we avoid
emitting a 4xx that would invite probing. `bot_filtered` is bumped on an internal
counter only.

### 3.4 Rate limiting
**Algorithm — per-IP token bucket**, keyed on `ip_hash` (privacy-preserving key):
- **Capacity:** 30 tokens. **Refill:** 1 token / 2s (30/min sustained; short
  bursts up to 30 absorbed). Each accepted request consumes 1 token.
- Empty bucket → **`429 rate_limited`** with `Retry-After` = seconds to next
  token, plus the §1.5 `RateLimit-*` headers.
- **Storage:** in-memory `Map<ip_hash, {tokens, updatedAt}>` per server instance,
  swept lazily on access.

```ts
// ponytail: single-instance in-memory bucket. Correct for one Node process /
// the assignment's deploy. If horizontally scaled, swap the Map for Upstash
// Redis (INCR + EXPIRE or a Lua token-bucket) — same interface, no caller change.
```

Token bucket (not fixed-window) is chosen because fixed windows let a client
double the intended rate across a window boundary; the bucket is bounded on
bursts with no extra moving parts.

### 3.5 Response — `202 Accepted`
```ts
interface TrackResponse { accepted: true } // 202; also returned for bot-filtered
```
```json
{ "accepted": true }
```
Rationale: `202` = "accepted for processing," which does not promise persistence,
so it correctly covers both stored and bot-filtered outcomes without leaking which
happened. The successful insert is broadcast to `/api/stream` subscribers (§5).

### 3.6 Errors
| Status | Code | When |
|---|---|---|
| 400 | `bad_request` | body fails `trackBody` (bad `event_type`, `path` not `/…`, oversize). |
| 429 | `rate_limited` | token bucket empty; includes `Retry-After` + `RateLimit-*`. |
| 500 | `internal` | unexpected (DB/geo failure). Beacon client ignores it. |

---

## 4. `GET /api/events` — activity list

Feeds `/dashboard/activity` (TanStack Table) and the Overview "recent" block, and
is the **polling fallback** for `/api/stream` (§5.5).

- **Method / path:** `GET /api/events`
- **Auth:** session required → else `401`.

### 4.1 Pagination choice — **cursor (keyset)**, justified
This is an **append-heavy, real-time feed**: new rows arrive at the head
continuously (spec §1, §9). **Offset/limit is wrong here** — inserts between page
requests shift every row's offset, so `LIMIT/OFFSET` duplicates or skips rows, and
deep offsets force a full scan. **Keyset (cursor) pagination on `(created_at, id)`
is stable under concurrent inserts and is an indexed range scan at any depth.** So
this API uses cursors, not offsets.

- **Cursor** = opaque `base64url(created_at + "|" + id)`. `id` is the tiebreaker
  for identical `created_at`. Cursors are validated on decode → malformed →
  `400 bad_request`.
- **Two directions, two params** (both keyset over the same index):
  - `cursor` — fetch the page **older than** this cursor (history / infinite
    scroll, default `desc` order).
  - `since` — fetch rows **strictly newer than** this cursor, ascending (live tail
    / polling fallback).
  Pass at most one.
- **No exact total count.** Deliberate: an accurate `COUNT(*)` over a live table is
  expensive and immediately stale. Totals live in `/api/stats`. The response gives
  `has_more` for "load more" affordances.
- **Column sorting in the table UI is client-side** over the loaded page (TanStack
  Table does this natively). Server order is fixed to `created_at` (with an
  `asc|desc` toggle) so the cursor's sort key stays stable — the correct tradeoff
  for keyset pagination.

### 4.2 Request query (zod)
```ts
export const eventsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),                 // older page (desc)
  since: z.string().optional(),                  // newer-than, ascending (live tail / poll)
  order: z.enum(["asc", "desc"]).default("desc"),

  // filters (spec §9 activity table)
  identity: z.enum(["all", "signed_in", "anon"]).default("all"),
  country: z.string().length(2).toUpperCase().optional(),          // -> country_code
  device: z.enum(["desktop", "mobile", "tablet"]).optional(),      // -> device_type
  event_type: z.enum(["page_view", "login", "signup", "click"]).optional(),
  q: z.string().max(120).optional(),             // search: path / city / referrer / user.name (ILIKE)
  from: z.string().datetime().optional(),        // created_at >= from
  to: z.string().datetime().optional(),          // created_at <  to
}).refine(v => !(v.cursor && v.since), { message: "Pass either cursor or since, not both" });
export type EventsQuery = z.infer<typeof eventsQuery>;
```

Filter mapping: `identity` → `user_id IS NULL` (`anon`) / `IS NOT NULL`
(`signed_in`); `country` → `country_code = ?`; `device` → `device_type = ?`;
`q` → `ILIKE '%q%'` across `path`, `city`, `referrer`, and joined `users.name`;
`from`/`to` → half-open `created_at` range. All combine with `AND`.

### 4.3 Response — `200 OK`
```ts
interface EventsResponse {
  items: EventDTO[];                 // §2, newest-first by default
  page: {
    limit: number;
    order: "asc" | "desc";
    next_cursor: string | null;      // pass as ?cursor= for the next older page; null = end
    has_more: boolean;
  };
}
```
```json
{
  "items": [
    {
      "id": "6b1c9a2e-0f4d-4a1b-9c33-2d7e5f0a1b22",
      "created_at": "2026-07-16T09:00:01.123Z",
      "event_type": "page_view",
      "identity": "anonymous",
      "user": null,
      "session_id": "a1f0c3d2-4b5e-4c6a-8d7e-9f0a1b2c3d4e",
      "ip_hash": "9f2c…c1a7",
      "location": { "country": "Germany", "country_code": "DE", "region": "BE",
                    "city": "Berlin", "latitude": 52.52, "longitude": 13.405 },
      "device": { "browser": "Chrome", "os": "macOS", "device_type": "desktop" },
      "path": "/login",
      "referrer": "https://www.google.com/"
    }
  ],
  "page": { "limit": 50, "order": "desc",
            "next_cursor": "MjAyNi0wNy0xNlQwOTowMDowMS4xMjNafDZiMWM5YTJl", "has_more": true }
}
```

### 4.4 Errors
| Status | Code | When |
|---|---|---|
| 400 | `bad_request` | bad query, malformed `cursor`/`since`, both supplied. |
| 401 | `unauthorized` | no valid session. |
| 500 | `internal` | query failure. |

---

## 5. `GET /api/stats` — KPI aggregates + chart series

One call powers the whole Overview: the five KPI tiles and all three graphs
(spec §9). Recomputed per request over the selected `range`.

- **Method / path:** `GET /api/stats`
- **Auth:** session required → else `401`.

### 5.1 Request query (zod)
```ts
export const statsQuery = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("7d"),
});
export type StatsQuery = z.infer<typeof statsQuery>;
```
`range` drives both the KPI comparison window and the time-series buckets:
| range | window | `visits_over_time` bucket (`date_trunc`) |
|---|---|---|
| `24h` | now-24h → now | hour (24 points) |
| `7d` | now-7d → now | day (7 points) |
| `30d` | now-30d → now | day (30 points) |

`delta_pct` compares the window against the immediately-preceding equal window.
`live_now` is **range-independent**: distinct `session_id` seen in the last 5
minutes (spec §9 "active sessions, last 5 min").

### 5.2 Response — `200 OK`
KPI object keyed **exactly** by the spec §12 KPI keys.
```ts
interface StatsResponse {
  range: "24h" | "7d" | "30d";
  generated_at: string;                 // ISO
  kpis: {
    total_visits:    { value: number; delta_pct: number };   // event_type='page_view' in window
    unique_visitors: { value: number; delta_pct: number };   // distinct session_id in window
    signed_in_ratio: { value: number; signed_in: number; anonymous: number }; // value = signed_in/total, 0..1
    live_now:        { value: number };                       // distinct session_id, last 5 min
    top_country:     { country: string | null; country_code: string | null; value: number }; // most visits
  };
  series: {
    // chart 1 — visits over time (area/line)
    visits_over_time: Array<{ t: string; visits: number; unique: number }>;
    // chart 2 — world map (react-simple-maps); lat/lng = country centroid for markers
    by_country: Array<{ country: string; country_code: string; visits: number;
                        latitude: number; longitude: number }>;
    // chart 3 — device donut + referrer bars
    by_device:   Array<{ device_type: DeviceType; visits: number }>;
    by_referrer: Array<{ referrer: string; visits: number }>;  // top N (e.g. 8), desc
  };
}
```
```json
{
  "range": "7d",
  "generated_at": "2026-07-16T09:00:05.000Z",
  "kpis": {
    "total_visits": { "value": 1042, "delta_pct": 12.4 },
    "unique_visitors": { "value": 318, "delta_pct": 8.1 },
    "signed_in_ratio": { "value": 0.36, "signed_in": 114, "anonymous": 204 },
    "live_now": { "value": 5 },
    "top_country": { "country": "United States", "country_code": "US", "value": 291 }
  },
  "series": {
    "visits_over_time": [
      { "t": "2026-07-10T00:00:00.000Z", "visits": 132, "unique": 47 },
      { "t": "2026-07-11T00:00:00.000Z", "visits": 158, "unique": 51 }
    ],
    "by_country": [
      { "country": "United States", "country_code": "US", "visits": 291, "latitude": 37.09, "longitude": -95.71 },
      { "country": "Germany", "country_code": "DE", "visits": 173, "latitude": 51.16, "longitude": 10.45 }
    ],
    "by_device": [
      { "device_type": "desktop", "visits": 640 },
      { "device_type": "mobile", "visits": 331 },
      { "device_type": "tablet", "visits": 71 }
    ],
    "by_referrer": [
      { "referrer": "direct", "visits": 402 },
      { "referrer": "google.com", "visits": 268 },
      { "referrer": "github.com", "visits": 141 }
    ]
  }
}
```
Notes: empty `referrer` is bucketed as `"direct"`. Time buckets are zero-filled
so charts have no gaps. `delta_pct` is rounded to 1 decimal; `0` when the prior
window is empty.

### 5.3 Errors
| Status | Code | When |
|---|---|---|
| 400 | `bad_request` | `range` not in enum. |
| 401 | `unauthorized` | no session. |
| 500 | `internal` | aggregation failure. |

---

## 6. `GET /api/stream` — SSE live feed

Server-Sent Events stream of newly-ingested activity rows, powering the live table
insert + header "connected" pulse (spec §9). One row per message.

- **Method / path:** `GET /api/stream`
- **Auth:** **cookie session required.** `EventSource` cannot set custom headers,
  so auth rides the same-origin Auth.js session cookie (sent automatically). No
  session → `401` (see §5.4 — a `401` means *redirect to login*, **not** fall back
  to polling).
- **Response headers:**
  ```
  Content-Type: text/event-stream
  Cache-Control: no-store
  Connection: keep-alive
  X-Accel-Buffering: no        # disable proxy buffering so events flush immediately
  ```

### 6.1 Request query (zod)
```ts
export const streamQuery = z.object({
  since: z.string().optional(),   // optional resume cursor when Last-Event-ID header is absent
});
```
Primary resume mechanism is the `Last-Event-ID` header (§6.3); `?since=` is a
manual override for clients/tests that cannot rely on it.

### 6.2 Wire format
Each new `events` row → one SSE message. `data:` is a **`EventDTO`** (§2, byte-for-
byte identical to `/api/events` items). `id:` is the same opaque `(created_at,id)`
cursor used for pagination, so reconnection reuses the keyset query.

```
retry: 3000

: keepalive

id: MjAyNi0wNy0xNlQwOTowMDowMS4xMjNafDZiMWM5YTJl
event: activity
data: {"id":"6b1c9a2e-…","created_at":"2026-07-16T09:00:01.123Z","event_type":"page_view","identity":"anonymous","user":null,"session_id":"a1f0…","ip_hash":"9f2c…","location":{"country":"Germany","country_code":"DE","region":"BE","city":"Berlin","latitude":52.52,"longitude":13.405},"device":{"browser":"Chrome","os":"macOS","device_type":"desktop"},"path":"/login","referrer":"https://www.google.com/"}

```
- **On connect:** server emits `retry: 3000` (client reconnect backoff = 3s) once,
  then streams. Named event is `activity`; the client listens with
  `es.addEventListener("activity", …)`.

### 6.3 Heartbeat + reconnection
- **Heartbeat:** a comment line `: keepalive\n\n` every **15s**. Comments are
  ignored by `EventSource` but keep intermediaries from idle-closing the socket
  and let the client detect a dead link.
- **Reconnection:** `EventSource` auto-reconnects after `retry` ms and replays the
  last `id:` it saw via the **`Last-Event-ID`** request header. The server decodes
  it, **replays** rows with `created_at,id` **greater than** that cursor (bounded,
  e.g. last ≤500 missed rows, ascending), then resumes the live tail. No gap, no
  dupes. If neither `Last-Event-ID` nor `?since=` is present, the stream starts
  from "now" (no backfill).

### 6.4 Transport
- `page_view`/`login`/`signup`/`click` inserts from `/api/track` are published to
  a lightweight in-process pub/sub; each open stream writes matching rows to its
  `ReadableStream`.
  ```ts
  // ponytail: in-process EventEmitter fan-out — one Node instance. If scaled
  // horizontally, back it with Postgres LISTEN/NOTIFY or Redis pub/sub so every
  // instance sees every insert. Same publish() call site, no route change.
  ```
- Stream closes cleanly on `request.signal` abort (client navigates away).

### 6.5 Polling fallback contract (spec §8)
When SSE cannot be used — `EventSource` unsupported, repeated transport
`onerror`/`CLOSED` from a buffering proxy, or a network error (**not** a `401`) —
the client transparently falls back to polling `/api/events`. Contract:

1. Track the newest cursor the client holds (`newestCursor`, seeded from the last
   `/api/events` load or SSE `id:`).
2. Every **5s** (exponential backoff up to 30s while empty; reset on data):
   `GET /api/events?since=<newestCursor>&order=asc&limit=100`.
3. Apply `items[]` in order, **dedupe by `id`**, advance `newestCursor` to the last
   item, and run the **same** new-row-highlight the SSE path uses (identical
   `EventDTO`, so UI code is shared).
4. On network recovery the client may re-attempt `EventSource`.
5. A `401` is terminal — stop polling and redirect to `/login` (session expired),
   never loop.

### 6.6 Errors
| Status | Code | When |
|---|---|---|
| 200 | – | stream opens (`text/event-stream`). |
| 401 | `unauthorized` | no session — client redirects to login, does **not** poll. |
| 429 | `rate_limited` | optional per-IP concurrent-connection cap (e.g. 5). |
| 500 | `internal` | stream setup failure — client falls back to polling. |

---

## 7. `/api/auth/*` — Auth.js (NextAuth v5)

Auth.js owns this namespace via a single catch-all route
`app/api/auth/[...nextauth]/route.ts` exporting `GET` + `POST` from the shared
`auth` config (Drizzle Postgres adapter, **DB sessions** — spec §4). We add no
custom routes here; login/signup drive these via server actions (§1.6).

### 7.1 Providers
- **Credentials** (email + password). `authorize()` zod-validates, looks up the
  `users` row, `bcrypt.compare(pw, hash)` (hashes are cost-12). Success → session.
- **Google OAuth** ("Continue with Google") — standard OAuth code flow.

### 7.2 Canonical Auth.js routes
| Route | Method | Purpose |
|---|---|---|
| `/api/auth/session` | GET | current session JSON (§7.3) or `{}`. |
| `/api/auth/csrf` | GET | `{ csrfToken }` for the double-submit cookie (§7.4). |
| `/api/auth/providers` | GET | configured providers (for the login UI). |
| `/api/auth/signin/:provider` | POST | begin sign-in (`credentials` verifies; `google` → 302 to Google). |
| `/api/auth/callback/:provider` | GET/POST | provider callback → set session cookie, 302 to app. |
| `/api/auth/signout` | POST | destroy DB session + clear cookie, 302. |

### 7.3 Session shape
`GET /api/auth/session` (DB-session backed):
```ts
interface Session {
  user: { id: string; name: string | null; email: string; image: string | null };
  expires: string; // ISO
}
```
```json
{ "user": { "id": "b3…", "name": "Ada Lovelace", "email": "ada@example.com",
            "image": "https://…/a.png" }, "expires": "2026-08-15T09:00:00.000Z" }
```
Logged out → `200 {}`. Route handlers read this server-side via `auth()`; it is
the same session the guarded endpoints (§1.2) and `middleware.ts` (guards
`/dashboard/*`, redirects anon → `/login`) check.

### 7.4 CSRF
Auth.js's built-in **double-submit cookie**: state-changing POSTs
(`signin`/`signout`/credentials callback) require a `csrfToken` field whose value
matches the `__Host-authjs.csrf-token` cookie. Mismatch/absent → **`403`**. The
login/signup forms fetch the token from `/api/auth/csrf` (the `signIn()` helper
handles this automatically). OAuth `state` provides equivalent CSRF protection on
the Google callback.

### 7.5 Signup (server action, §1.6)
```ts
export const signupSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),   // spec §4: ≥ 8 chars
});
```
Flow: validate → reject duplicate email (`400 bad_request`) → `bcrypt.hash(pw, 12)`
→ insert `users` → `signIn("credentials", …)` to establish the session. The login
action uses the same `credentialsSchema` (name omitted). Neither is a new
`/api/*` endpoint.

### 7.6 Errors
| Status | When |
|---|---|
| 200 | `session`/`csrf`/`providers`; successful credentials verify. |
| 302 | `signin`/`callback`/`signout` redirects (incl. bad-credentials → `/login?error=CredentialsSignin`). |
| 400 | malformed sign-in/signup payload. |
| 403 | CSRF token mismatch. |
| 500 | adapter/DB failure. |

---

## 8. Cross-cutting summary

- **Endpoints are exactly** the five spec groups — nothing invented. Login/signup
  are server actions over `/api/auth/*`, not new routes.
- **Field names** everywhere match `events` columns (spec §5); the DTO only groups
  them, preserving each name.
- **Trust boundary:** zod on every input; server derives all IP/geo/device;
  **raw `ip` never leaves the server**; only `ip_hash` is exposed.
- **Live path parity:** `/api/stream` `data:` and `/api/events` `items[]` are the
  same `EventDTO`, and `/api/events?since=` is the SSE polling fallback — one
  render path for both.
- **Simplifications with a known ceiling** (single-instance rate-limit bucket,
  in-process SSE fan-out) are marked `ponytail:` with their Redis/LISTEN-NOTIFY
  upgrade path — correct for the assignment's single-instance deploy.
