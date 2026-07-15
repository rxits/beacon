# Beacon — Privacy & Security

> Elaborates on `00-product-spec.md` §5 (fields), §11 (privacy & security), §12
> (canonical names). If a name here conflicts with the master spec, the master
> wins — fix it there first. **This document is engineering guidance, not legal
> advice.**

**Status:** approved design · **Date:** 2026-07-16
**Applies to:** the ingest endpoint, auth, dashboard, and database of a public
analytics app that records visitor activity **including public IP addresses (PII).**

---

## 0. Posture in one paragraph

Beacon captures personal data (IP, approximate location, device) about every
visitor to a public page, and shows it on an admin-style dashboard to any
authenticated user. That is the assignment. Our job is to make that defensible:
**minimize by default** (store a salted hash of the IP, not the raw IP),
**be transparent** (a plain-language notice banner + privacy policy),
**retain briefly** (short windows, then anonymize or delete), and **harden the
obvious attack surfaces** (spoofed IP headers, ingest flooding, credential
attacks, injection, secret leakage). The honest residual risks are listed in §10.

### 0.1 Secrets & privacy config (all server-side env — never shipped to client)

| Env var | Purpose | Notes |
|---|---|---|
| `AUTH_SECRET` | Auth.js session/CSRF signing | 32+ random bytes; rotate = logs everyone out |
| `DATABASE_URL` | Postgres DSN | include `sslmode=require`; least-priv role, not superuser |
| `IP_SALT` | pepper for `ip_hash` = `sha256(ip + IP_SALT)` | 32+ random bytes; **secret**, see §3.2 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth | secret half server-only |
| `IP_STORAGE_MODE` | `hashed` \| `truncated` \| `raw` | default `hashed`; backs the Settings toggle (§3.4) |
| `TRUSTED_PROXY_HOPS` | count of proxies between client and app | default `1` (Vercel edge); drives XFF parsing (§6.4) |
| `EVENT_RETENTION_DAYS` / `RAW_IP_RETENTION_DAYS` | retention windows | default `90` / `7` (§4) |

Only `NEXT_PUBLIC_*` vars reach the browser. None of the above may be prefixed
`NEXT_PUBLIC_`. `bcrypt`, `geoip-lite`, and the salt/hash code are server-only
modules (`import "server-only"`).

---

## 1. Data inventory & PII classification

Every field from spec §5, classified. "PII" = relates to an identifiable person
under GDPR Art. 4(1). **An IP address is personal data** (CJEU *Breyer*), and so
is geolocation derived from it — even without a name attached.

| Field | Class | PII? | Rationale / handling |
|---|---|---|---|
| `id` | Technical | No | Random UUID for the row; not derived from the person. |
| `session_id` | Pseudonymous ID | **Yes (pseudonymous)** | Correlates a visitor's events. Cookie-set; non-essential → consent (§2.2). |
| `user_id` | Identity link | **Yes** | FK to `users`; directly identifies the account. Null = anonymous. |
| `ip` | Network identifier | **Yes (direct)** | Real public IP. **Not stored by default** — see §3. Highest-sensitivity field. |
| `ip_hash` | Pseudonymous ID | **Yes (pseudonymous)** | `sha256(ip + IP_SALT)`. Reversible by anyone holding `IP_SALT` (IPv4 space is tiny), so it is *pseudonymization, not anonymization* (§3.2). |
| `country`, `country_code` | Coarse geo | Low / borderline | Country alone is low-risk; treat as personal in combination with the rest. Kept longest. |
| `region`, `city` | Fine geo | **Yes** | Narrows location; personal in combination. Dropped on anonymization (§4). |
| `latitude`, `longitude` | Fine geo | **Yes** | geoip-lite returns city-centroid, not device GPS — still location data. For the map only; coarsen/drop on anonymization. |
| `browser`, `os`, `device_type` | Device metadata | Low (fingerprint input) | Individually weak; contributes to fingerprinting in combination. Derived server-side from UA. |
| `path` | Behavioral | Low | Page visited. Personal in combination with an ID. Length-capped (§6.3). |
| `referrer` | Behavioral | Low | Traffic source. May itself contain PII in query strings → strip query string before store. |
| `event_type` | Behavioral | No | Enum: `page_view`\|`login`\|`signup`\|`click`. |
| `created_at` | Technical | No | Timestamp; personal only in combination. |

**Special-category data:** none intended. Precise location + browsing history can
be sensitive in aggregate — another reason for short retention (§4).
**Derived, never client-supplied:** `ip`, `ip_hash`, all geo, all device fields,
`user_id` are set server-side (spec §5). The client beacon may *propose* `path`,
`referrer`, `event_type` only, and those are validated and length-capped.

---

## 2. Legal & consent posture (not legal advice)

### 2.1 Lawful basis (GDPR-style)

| Processing | Basis | Note |
|---|---|---|
| Server-side capture of IP → geo/device on the initial page request | **Legitimate interest** (Art. 6(1)(f)): running, securing, and measuring a first-party service | Required by the assignment; document a balancing test in the policy. Cannot be fully consent-gated because the request header exists before any banner interaction. Mitigate by defaulting to `hashed` storage. |
| Setting the `session_id` correlation cookie | **Consent** (ePrivacy, non-essential cookie) | Gated by the banner; declined ⇒ no persistent cookie (§2.2). |
| Client beacon events (`/api/track`: extra `page_view`, `click`) | **Consent** | Declined ⇒ beacon disabled. |
| Account auth (email/password, Google) | **Contract** (Art. 6(1)(b)) | Needed to provide the signed-in dashboard. |
| Rate-limit / abuse logs keyed by `ip_hash` | **Legitimate interest** (security) | Retained short (§9). |

Rights to honor: access, rectification, **erasure** (§4.3), objection to
legitimate-interest processing. No selling/sharing; no non-EU transfer beyond the
hosting region; no automated decision-making with legal effect.

### 2.2 Consent / notice banner (`ConsentBanner`)

**When it shows:** on first load of any public page (`/login`, `/signup`), before
the visitor interacts, for anyone without a stored `beacon_consent` cookie.
Dismissal choice is persisted in a first-party `beacon_consent` cookie
(`accepted` | `declined`, 12-month expiry, `SameSite=Lax`, not `httpOnly` so the
client can read its own choice). Not shown inside `/dashboard/*` (authenticated
users are covered by the privacy policy at signup).

**Exact user-facing copy:**

> **This site records your visit.**
> Beacon is a live analytics demo. It logs each visit — your approximate location
> and device, worked out from your IP address — and shows it on a dashboard.
> Signed-out visits appear only as *"Anonymous."* By default your IP is stored as
> a one-way hash, never in the clear.
> **[ Accept ]  [ Decline ]**  ·  [ Privacy & data ]

Secondary line after **Decline** (inline, replacing the buttons):

> Declined. We won't set an analytics cookie or send further events from your
> browser. The single request that loaded this page is still logged in hashed,
> non-identifying form for security and abuse prevention. [ Change ]

**What Accept does:** writes `beacon_consent=accepted`; the `session_id` cookie is
set; the client beacon may POST `/api/track` for `page_view`/`click`.

**What Decline does:** writes `beacon_consent=declined`; **no** `session_id`
cookie is set (events for this visitor carry `session_id = null`); the client
beacon is disabled (no further `/api/track` calls). The unavoidable server-side
log of the initial request remains, stored per `IP_STORAGE_MODE` (default
`hashed`) under legitimate interest. We do **not** silently keep tracking a
visitor who declined — the only record is the one request that already arrived.

> Honesty note: this is a *notice + cookie/beacon consent* banner, not a hard
> consent gate on IP capture — the IP is in the request headers before the banner
> is answered. Defaulting to `hashed` storage is what makes that acceptable.

### 2.3 Privacy policy outline (linked from banner + footer)

1. **Who we are** — controller identity + contact for data requests.
2. **What we collect** — the §1 table in plain language; distinguish anonymous
   visitors (IP/geo/device) from account holders (name, email, avatar).
3. **Why & lawful basis** — the §2.1 table in prose, incl. the legitimate-interest
   balancing test for IP capture.
4. **IP handling** — that IP is hashed by default; what raw/truncated modes mean.
5. **Cookies** — `session_id` (consent), `beacon_consent` (choice record), the
   Auth.js session cookie (essential).
6. **Retention** — the windows in §4.
7. **Sharing** — none, beyond the hosting/DB provider (a processor).
8. **Your rights** — access, correction, erasure, objection; how to request (§4.3).
9. **Changes & contact** — version/date; email.

---

## 3. IP handling policy

### 3.1 Decision — default to hashed, raw is opt-in

`geoip-lite` needs the raw IP to resolve geo, so we **always have the raw IP
transiently** in the request handler. The decision is only whether to *persist*
it. **Default: do not persist raw IP.** At ingest:

1. Resolve `country/region/city/lat/long` from the raw IP **in memory**.
2. Compute `ip_hash = sha256(rawIp + IP_SALT)`.
3. Store `ip_hash` (always) and the geo fields; store `ip` per `IP_STORAGE_MODE`.
4. Let the raw IP go out of scope — never written unless mode is `raw`.

This keeps geo (which the world map needs) while making the highest-risk field —
the raw address — absent from the database by default. A DB dump then exposes
hashes, not addresses.

### 3.2 Salt (`IP_SALT`) management

- **Generate once:** `openssl rand -hex 32`. Store only in env / secret manager.
  Never commit; never log; not `NEXT_PUBLIC_`.
- **It is a secret, not a nonce.** IPv4 is 2³² addresses — trivially brute-forced.
  Anyone with `IP_SALT` can reverse any `ip_hash` by enumerating all IPs. So a
  salted hash of an IP is **pseudonymization, not anonymization** under GDPR;
  treat `ip_hash` as personal data and guard the salt like a password.
- **Rotation = intentional re-anonymization.** Rotating `IP_SALT` makes new hashes
  no longer match old ones (breaks per-visitor correlation and rate-limit keys
  across the boundary). Treat as long-lived; rotate only to deliberately sever
  linkage or after suspected salt compromise.
- One global pepper is sufficient here; per-row salts would break the correlation
  and rate-limiting that `ip_hash` exists to enable.

### 3.3 Truncation option

When some coarse network identity is wanted without a full address, `truncated`
mode stores `ip` with the host bits zeroed: **IPv4 → /24** (`203.0.113.0`),
**IPv6 → /48**. This is applied *before* storage and can also be applied before
the geo lookup if per-city precision isn't required. Truncated IPs are far weaker
identifiers but still store `ip_hash` (of the *full* IP) for correlation.

### 3.4 Settings toggle (`/dashboard/settings` → privacy)

The toggle sets `IP_STORAGE_MODE` (persisted app config) and governs **future**
ingests only — it never retroactively creates raw IPs that were never stored.

| Mode | `ip` column | `ip_hash` | Dashboard "who" shows | Use when |
|---|---|---|---|---|
| `hashed` **(default)** | `null` | stored | `Anonymous · <city>` (no address) | normal operation — most private |
| `truncated` | `/24` or `/48` masked | stored | masked IP `203.0.113.0` | need coarse network grouping |
| `raw` | full address | stored | full IP | debugging / explicit, documented need only |

Switching **to** `raw` is a privacy-material change: it must be reflected in the
banner/policy wording and recorded as an audit event (§9). Switching **to**
`hashed`/`truncated` should also offer to purge existing raw `ip` values.
Even in `raw` mode, prefer sending the client a masked IP for display and keeping
the full value server-side (don't over-expose PII to the browser).

---

## 4. Retention & deletion

Short windows bound the blast radius. Enforced by a daily sweep (`pnpm prune`, or
`pg_cron`) — idempotent, like the seed.

### 4.1 Windows

| Data | Retention | Then |
|---|---|---|
| Raw `ip` (if `raw` mode) | `RAW_IP_RETENTION_DAYS` = **7** | null the `ip` column; keep `ip_hash` |
| `events` rows (full detail) | `EVENT_RETENTION_DAYS` = **90** | anonymize (§4.2) or delete |
| Abuse / rate-limit logs | **14–30 days** | delete (§9) |
| Auth event rows (`login`/`signup`) | 90 days as events; aggregate longer | anonymize with the rest |
| Seed/demo events | not visitor PII | may persist; excluded from erasure |

Demo seed spans 30 days (spec §6), so 90-day retention comfortably covers every
dashboard surface.

### 4.2 Anonymization after the window

After `EVENT_RETENTION_DAYS`, convert a row to non-personal instead of deleting so
long-run aggregates survive: **null** `ip`, `ip_hash`, `session_id`, `user_id`,
`region`, `city`, `latitude`, `longitude`, and coarsen `referrer` to host-only.
**Keep** `country`, `device_type`, `event_type`, `created_at` (bucketed to the
day). A row with no identifier and country-level geo is no longer personal data.

### 4.3 Deletion on request (erasure)

- **Signed-in user:** `/dashboard/settings` → "Delete my account & data" →
  cascade-delete `users`/`accounts`/`sessions` and either delete their `events`
  or null `user_id` on them (their events become anonymous, not gone from counts).
- **Anonymous visitor:** they can supply the IP they used; we compute
  `sha256(ip + IP_SALT)` and delete rows matching that `ip_hash` within retention.
  This is why keeping `ip_hash` (not raw IP) still supports erasure.
- **SLA:** act within 30 days; deletions also propagate to backups on the backup
  cycle (document that in the policy).

---

## 5. Threat model (STRIDE)

Surfaces: **ingest** `/api/track`; **auth** `/api/auth/*` + credentials/sessions;
**dashboard** reads `/api/events`, `/api/stats`, `/api/stream` + pages; **DB**.
Each row: threat → concrete vector → mitigation.

### 5.1 Ingest — `/api/track`

| STRIDE | Vector | Mitigation |
|---|---|---|
| **S**poof | Forge `x-forwarded-for` to fake a victim's IP/geo, or spoof another `session_id` | Derive client IP only from the correct proxy hop (§6.4), never a client-chosen XFF token; `session_id` read from our signed cookie, not the body |
| **T**amper | Body claims `user_id`, injects fake `event_type`/geo | Server sets `user_id` from session, all geo/device from headers; zod `.strict()` enum-checks `event_type`; body may only carry `path`/`referrer`/`event_type` |
| **R**epudiate | Anonymous flood with no accountability | Persist `ip_hash` + `session_id` + `created_at`; rate-limit (§6.1) |
| **I**nfo disclosure | Endpoint reflects stored data back | Returns `204`, no body; no read path on `/api/track` |
| **D**oS | Flood to bloat DB / burn geoip CPU | Rate limit + payload cap + bot filter (§6); batched writes; pooled DB |
| **E**oP | Inject an event attributed to a real user/admin | No roles to escalate to; `user_id` never client-trusted |

### 5.2 Auth — `/api/auth/*`, credentials, sessions

| STRIDE | Vector | Mitigation |
|---|---|---|
| **S**poof | Credential stuffing / brute force | Rate-limit login by `ip_hash`+email; bcrypt cost 12 is deliberately slow; generic errors (§7.5); back-off on repeated failures |
| **T**amper | Forge/replay a session cookie | Auth.js **DB sessions** — cookie holds an opaque token validated against `sessions`; `httpOnly`+`Secure`+signed; server-side revocable |
| **R**epudiate | "I never logged in" | Record `login`/`signup` events with `user_id`+`ip_hash`+`created_at` |
| **I**nfo disclosure | Account enumeration; hash/PII leakage | Identical responses + equalized timing (§7.5); bcrypt hash never leaves DB; no password in any response/log |
| **D**oS | Hammer login so bcrypt(12) exhausts CPU | Rate-limit **before** hashing; cap concurrent hashes; fixed dummy-hash compare for unknown users |
| **E**oP | Bypass guard to reach dashboard/data | Middleware guards `/dashboard/*`; **APIs re-check the session server-side** (middleware alone is not authz); OAuth uses state + PKCE |

### 5.3 Dashboard & read APIs — `/api/events`, `/api/stats`, `/api/stream`, pages

| STRIDE | Vector | Mitigation |
|---|---|---|
| **S**poof | Hit read APIs while unauthenticated | Every read API checks the session on the server (not just middleware); unauth → 401/redirect |
| **T**amper | Injection via filter/sort/search/pagination params | zod-validate all query params; **allowlist** sortable/filterable columns; Drizzle parameterized (§8) |
| **R**epudiate | — | Low stakes for reads |
| **I**nfo disclosure | **Any authenticated user sees every visitor's IP/geo** (single-role admin view, spec §3) — one leaky endpoint = mass PII disclosure | `hashed` default so no raw IP exists to leak; never send raw `ip` to the client when display is masked; auth-gate `/api/events` **and** the `/api/stream` SSE on connect; paginate/limit; treat authed users as data viewers in the policy |
| **D**oS | Expensive `/api/stats` aggregates; unbounded `/api/events` page size; SSE connection exhaustion | Indexes on `created_at`, `country_code`, `ip_hash`; cap page size (e.g. ≤100); cache stats briefly; cap concurrent SSE + heartbeat/timeout; poll fallback (spec §8) |
| **E**oP | Read another tenant's data | No tenants/roles by design; ensure API authz is server-verified |

### 5.4 Database

| STRIDE | Vector | Mitigation |
|---|---|---|
| **S**poof | Rogue client connects to DB | Network-restricted DB; credentials in env only; TLS (`sslmode=require`) |
| **T**amper | SQL injection | Drizzle parameterized queries; zod at boundary; no string-built SQL/identifiers |
| **R**epudiate | Untraceable data change | App logs + `created_at`; migrations version-controlled (Drizzle) |
| **I**nfo disclosure | Stolen dump/backup exposes IPs + password hashes | `hashed` IPs (no raw addresses); bcrypt(12) passwords; **encryption at rest** (managed PG) + TLS in transit; least-priv app role; backups encrypted + access-controlled |
| **D**oS | Connection exhaustion | Pooled connections; `statement_timeout`; bounded query cost |
| **E**oP | App role has superuser rights | App connects as a role limited to CRUD on its schema — not owner/superuser |

---

## 6. Ingest abuse controls (`/api/track`)

### 6.1 Rate limiting

- **Algorithm:** token bucket keyed by **`ip_hash`** (works in every storage mode)
  with a `session_id` sub-key. Token bucket smooths legitimate bursts (page → a
  few clicks) while capping sustained abuse.
- **Limits (tune in load test):** refill **60 tokens/min/IP**, bucket size **20**
  (burst), 1 token per event. Global ceiling per instance as a backstop. Over
  limit → **`429`** + `Retry-After`, event dropped (not queued).
- **Store:** single instance → in-process LRU token buckets. Serverless is
  multi-instance, so per-instance limiting is only approximate.
  `ponytail: per-instance in-memory buckets; swap the counter store to Upstash/Redis if the app runs multi-instance and limits must be global.`

### 6.2 Bot / crawler filtering

- Parse UA (already done via `ua-parser-js`); drop obvious non-humans by UA
  substring (`bot|crawl|spider|slurp|headless|preview|monitor|curl|wget`) — the
  `isbot` package is the maintained list if we prefer not to hand-roll the regex.
- Drop **empty/absent UA**; drop known health-check/asset paths.
- Bot hits are dropped **before** DB write so they don't inflate `total_visits` /
  `unique_visitors`. Don't trust a self-declared "Googlebot" UA — for analytics,
  dropping is enough; no reverse-DNS verification needed.

### 6.3 Payload size caps

- Reject bodies over **2 KB** (`content-length` check + hard cap while reading) →
  `413`. `/api/track` only needs `path`, `referrer`, `event_type`.
- zod bounds each string: `path` ≤ 2048, `referrer` ≤ 2048, `event_type` ∈ enum.
  Strip the query string from `referrer` before store (may carry PII/tokens).
- `.strict()` schema — reject unknown keys rather than ignoring them.

### 6.4 Spoofed-header handling — trust only the correct proxy hop

`x-forwarded-for` is fully client-controllable. A malicious client can **prepend**
fake entries, so the **left-most / "first" token is the spoofable one** — never
trust it. Each proxy *appends* the address it actually saw to the **right**, so
with `n` trusted proxy hops the real client IP is the **n-th entry from the
right** (`n = TRUSTED_PROXY_HOPS`, default **1** for a single edge like Vercel).

> Correction to master spec §5: "`x-forwarded-for` first hop" must be read as
> *the hop our own edge observed* — i.e. the right-most trusted entry / the
> platform header — **not** the literal first token. Suggest fixing §5 wording.

```ts
// Prefer a platform header the client cannot forge; else parse XFF from the right.
function clientIp(req: Request): string | null {
  const platform = req.headers.get("x-vercel-forwarded-for"); // or x-real-ip from your proxy
  if (platform) return platform.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (!xff) return null;
  const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
  const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  return parts[parts.length - hops] ?? null; // n-th from the right; NOT parts[0]
}
```

If the app is not actually behind a proxy, ignore XFF entirely and use the socket
address. Never let `TRUSTED_PROXY_HOPS` exceed the real proxy count, or the value
becomes attacker-controllable again.
`ponytail: proxy hop count is a real deploy knob — set it to your actual edge count, don't hardcode assumptions.`

---

## 7. AuthN / AuthZ security

### 7.1 Password hashing
- **bcrypt, cost factor 12** (spec §4) — ~200–300 ms/hash, tuned so brute force is
  expensive but login stays responsive. Argon2id is the noted upgrade path; bcrypt
  is fine here. Never store or log the plaintext or the hash outside `users`.

### 7.2 Password rules (NIST 800-63B leaning — length over complexity)
- **Min 8 chars** (spec §4, zod), **max 72 bytes** (bcrypt truncates beyond 72 —
  enforce so users aren't silently truncated).
- No forced composition classes, no periodic rotation. Optionally block a small
  common-password list (or `zxcvbn` if we add a dep). Trim nothing but reject
  all-whitespace.

### 7.3 Session & cookie flags
- Auth.js **DB sessions** (Drizzle adapter, spec §4). Session cookie:
  **`httpOnly`**, **`Secure`** (prod), **`SameSite=Lax`**, `Path=/`, host-prefixed
  (`__Secure-`/`__Host-`), signed with `AUTH_SECRET`.
- `SameSite=Lax` (not `Strict`) is required so the Google OAuth redirect back to
  the app carries the cookie. Session rows are server-revocable; rolling expiry
  (e.g. 30 days). Logout deletes the `sessions` row, not just the cookie.

### 7.4 CSRF & OAuth scopes
- **CSRF:** Auth.js built-in double-submit token on the credentials sign-in POST
  and auth mutations; `SameSite=Lax` is defense-in-depth. For `/api/track` (a POST)
  check the `Origin`/same-origin to stop cross-site event injection.
- **Google OAuth:** request the **minimal** scopes `openid email profile` only —
  no offline access, no Drive/Calendar/Contacts. Auth.js supplies `state` + PKCE
  on the authorization request; validate on callback.

### 7.5 Account-enumeration resistance
- **Login:** one generic message — *"Invalid email or password."* — whether the
  email is unknown or the password is wrong. When the email is unknown, still run
  a `bcrypt.compare` against a fixed dummy hash so response time doesn't reveal
  existence (timing enumeration).
- **Signup:** don't confirm "email already registered." Enforce the unique
  constraint in the DB and return a **neutral** result; with email verification
  (the `verification_tokens` table exists) prefer *"If this address is new, check
  your inbox to finish."* Rate-limit signup by `ip_hash`.
- Apply the same neutral responses to any future password-reset flow.
> Honesty note: without email verification wired up, signup enumeration can't be
> fully closed (the unique constraint is observable). Generic messaging +
> rate-limiting is the reasonable ceiling for this scope.

---

## 8. Application hardening

### 8.1 Validate at every trust boundary (zod)
- `/api/track` body, `/api/events` + `/api/stats` query params, login/signup
  forms, settings updates — all parsed with zod `.strict()` (reject unknown keys),
  with length/enum bounds. Parse, don't hand-check. Reject → `400`, no echo of the
  bad value.

### 8.2 Parameterized queries (Drizzle)
- Use Drizzle's query builder / `sql` placeholders only — never string-interpolate
  user input into SQL. **Dynamic sort/filter columns come from an allowlist** of
  Drizzle column refs keyed by a zod enum, never from a raw identifier string
  (you can't parameterize identifiers).

### 8.3 Secrets
- All secrets in env / secret manager (§0.1); server-only. Audit that no
  `NEXT_PUBLIC_*` var carries a secret. `geoip-lite`, `bcrypt`, salt/hash live in
  `server-only` modules so they can't be imported into client bundles.

### 8.4 Security headers + CSP
Set via `next.config` `headers()` (or middleware). App is **self-contained and
monochrome** — self-hosted Geist fonts (`next/font`), no CDN scripts, no external
analytics — so the CSP can be tight:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-<per-request>' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none'; base-uri 'self'; form-action 'self';
  object-src 'none'; upgrade-insecure-requests;
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
X-Frame-Options: DENY
```

Notes:
- **script-src** uses a per-request **nonce + `strict-dynamic`** (avoid
  `'unsafe-inline'` for scripts). Next dev needs `'unsafe-eval'` — add it in dev
  only, never prod.
- **style-src `'unsafe-inline'`** is the one pragmatic allowance: Framer Motion /
  Recharts inject inline styles. Inline *style* is low-risk vs inline *script*; a
  nonce on styles is the stricter upgrade if wanted.
- **img-src `'self' data:`** assumes avatars are local/proxied. If Google profile
  images are shown directly, either add `https://lh3.googleusercontent.com` or
  (preferred, stays self-contained) proxy/cache avatars locally.
- `Permissions-Policy` disables **browser** geolocation — Beacon derives location
  from IP, never the device sensor.

### 8.5 Dependency hygiene
- Commit the pnpm lockfile; `pnpm audit` (and `pnpm outdated`) in CI; Renovate/
  Dependabot for updates. Keep the dep list minimal (spec §7 is already lean —
  fewer deps = smaller supply-chain surface). Refresh `geoip-lite`'s bundled
  database periodically (stale geo, not a vuln, but accuracy). Review new deps
  before adding.

---

## 9. Logging & audit

### 9.1 Log
- Request logs: method, path, status, latency, **`ip_hash`** (not raw IP),
  UA class. Auth events: `login`/`signup` success/failure with `user_id` (or a
  hashed email for failures) + `ip_hash` + `created_at` — reuse the `events` table
  (`event_type` `login`/`signup`), no separate audit table needed.
  `ponytail: events table doubles as the auth audit log; add a tamper-evident audit table only if that requirement appears.`
- Security signals: rate-limit `429`s, dropped bots, oversized-payload `413`s,
  validation rejects (counts, not payloads).
- **Config/audit events:** changes to `IP_STORAGE_MODE` (esp. → `raw`), retention
  settings, account deletion — record who, when, old→new.

### 9.2 Never log
- Plaintext passwords or bcrypt hashes; session tokens / cookies / `Authorization`
  / `Set-Cookie`; `AUTH_SECRET`, `IP_SALT`, `DATABASE_URL`, Google tokens.
- **Full raw IP whenever `IP_STORAGE_MODE` isn't `raw`** — log `ip_hash` instead,
  so logs don't become a backdoor around the hashed-only policy.
- Full request bodies / geo detail beyond what's needed. Redact by allowlist
  (log known-safe fields), not blocklist.

### 9.3 PII in logs
- Treat logs as a **data store**: same access controls, and **short retention
  (14–30 days)** — often shorter than `events`. Don't forward logs to third
  parties without saying so in the policy. Structured logging with a redaction
  layer at the boundary.

---

## 10. Residual risks & accepted tradeoffs

1. **Single-role admin view (by design, spec §3).** Every authenticated user sees
   all visitors' data. Mitigated by hashed-default (no raw IP to see) and treating
   authed users as data viewers in the policy — but it is a real exposure and the
   reason `/api/events` and `/api/stream` must never be un-authed.
2. **`ip_hash` is pseudonymous, not anonymous.** Whoever holds `IP_SALT` can
   reverse it (small IP space). Guard the salt like a credential (§3.2).
3. **Legitimate-interest IP capture isn't hard consent.** The initial request is
   logged before the banner is answered; hashed-default is the compensating
   control (§2.1–2.2).
4. **Per-instance rate limiting** is approximate on serverless until backed by a
   shared store (§6.1).
5. **Signup enumeration** isn't fully closed without email verification (§7.5).

### Pre-ship security checklist
- [ ] `IP_STORAGE_MODE` defaults to `hashed`; raw purge job runs at `RAW_IP_RETENTION_DAYS`.
- [ ] `IP_SALT`, `AUTH_SECRET` are 32+ random bytes, env-only, not `NEXT_PUBLIC_`.
- [ ] Client IP parsed as n-th-from-right per `TRUSTED_PROXY_HOPS`, never `xff[0]` (§6.4).
- [ ] `/api/events`, `/api/stats`, `/api/stream` re-check session server-side.
- [ ] zod `.strict()` on `/api/track`, query params, auth + settings forms.
- [ ] bcrypt cost 12; dummy-hash compare for unknown users; generic auth errors.
- [ ] Cookies `httpOnly`+`Secure`+`SameSite=Lax`; Google scopes = `openid email profile`.
- [ ] CSP + HSTS + nosniff + Referrer-Policy + Permissions-Policy shipped; no `NEXT_PUBLIC_` secret.
- [ ] Rate limit + bot filter + 2 KB payload cap live on `/api/track`.
- [ ] Retention sweep scheduled; erasure path works for account + `ip_hash`.
- [ ] `ConsentBanner` copy live; Decline suppresses cookie + beacon.
- [ ] Logs carry `ip_hash` not raw IP; no secrets/passwords/tokens in logs.
