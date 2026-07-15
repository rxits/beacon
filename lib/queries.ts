import { db } from '@/db';
import { events, users } from '@/db/schema';
import { and, desc, eq, gte, gt, isNull, isNotNull, or, ilike, sql, type SQL } from 'drizzle-orm';
import { toEventDTO, type EventDTO } from './dto';

export type Range = '24h' | '7d' | '30d';
const RANGE_MS: Record<Range, number> = { '24h': 864e5, '7d': 7 * 864e5, '30d': 30 * 864e5 };

type Kpi = { value: number; delta_pct: number | null };
export type StatsResponse = {
  range: Range;
  kpis: {
    total_visits: Kpi;
    unique_visitors: Kpi;
    signed_in_ratio: { value: number; signed_in: number; anonymous: number };
    live_now: { value: number };
    top_country: { country: string | null; country_code: string | null; value: number };
  };
  series: {
    visits_over_time: Array<{ t: string; visits: number; uniques: number }>;
    by_country: Array<{ country: string | null; country_code: string | null; value: number }>;
    by_device: Array<{ device: string; value: number }>;
    by_referrer: Array<{ source: string; value: number }>;
    by_geo: Array<{ lat: number; lng: number; value: number; country: string | null }>;
  };
};

const ts = (v: unknown) => new Date(v as string).getTime();
const delta = (cur: number, prev: number): number | null => (prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10);
const uniqKey = (r: { userId: string | null; ipHash: string | null }) => r.userId ?? r.ipHash ?? 'unknown';
const referrerHost = (r: string | null): string => {
  if (!r) return 'Direct';
  try { return new URL(r).hostname.replace(/^www\./, ''); } catch { return 'Direct'; }
};

export async function getStats(range: Range): Promise<StatsResponse> {
  const ms = RANGE_MS[range] ?? RANGE_MS['7d'];
  const now = Date.now();
  const windowStart = new Date(now - ms);
  const prevStart = new Date(now - 2 * ms);

  const rows = await db
    .select({
      createdAt: events.createdAt, userId: events.userId, ipHash: events.ipHash,
      sessionId: events.sessionId, country: events.country, countryCode: events.countryCode,
      deviceType: events.deviceType, referrer: events.referrer, latitude: events.latitude, longitude: events.longitude,
    })
    .from(events)
    .where(gte(events.createdAt, prevStart));

  const cur = rows.filter((r) => ts(r.createdAt) >= windowStart.getTime() && ts(r.createdAt) <= now);
  const prev = rows.filter((r) => ts(r.createdAt) < windowStart.getTime());

  const curUniq = new Set(cur.map(uniqKey)).size;
  const prevUniq = new Set(prev.map(uniqKey)).size;
  const signedIn = cur.filter((r) => r.userId).length;
  const anonymous = cur.length - signedIn;

  const liveCutoff = now - 5 * 60_000;
  const liveNow = new Set(cur.filter((r) => ts(r.createdAt) >= liveCutoff).map((r) => r.sessionId ?? uniqKey(r))).size;

  const countryCounts = new Map<string, { country: string | null; code: string | null; n: number }>();
  const deviceCounts = new Map<string, number>();
  const refCounts = new Map<string, number>();
  const geoAgg = new Map<string, { lat: number; lng: number; value: number; country: string | null }>();
  for (const r of cur) {
    const ckey = r.countryCode ?? 'ZZ';
    const c = countryCounts.get(ckey) ?? { country: r.country, code: r.countryCode, n: 0 };
    c.n += 1; countryCounts.set(ckey, c);
    deviceCounts.set(r.deviceType ?? 'unknown', (deviceCounts.get(r.deviceType ?? 'unknown') ?? 0) + 1);
    const host = referrerHost(r.referrer);
    refCounts.set(host, (refCounts.get(host) ?? 0) + 1);
    if (r.latitude != null && r.longitude != null) {
      const gkey = r.countryCode ?? `${r.latitude.toFixed(1)},${r.longitude.toFixed(1)}`;
      const g = geoAgg.get(gkey) ?? { lat: r.latitude, lng: r.longitude, value: 0, country: r.country };
      g.value += 1; geoAgg.set(gkey, g);
    }
  }
  const byCountry = [...countryCounts.values()].sort((a, b) => b.n - a.n);
  const top = byCountry[0];

  const buckets = range === '24h' ? 24 : range === '7d' ? 7 : 30;
  const step = range === '24h' ? 3600e3 : 864e5;
  const series = Array.from({ length: buckets }, (_, i) => {
    const start = now - (buckets - i) * step, end = start + step;
    const inB = cur.filter((r) => ts(r.createdAt) >= start && ts(r.createdAt) < end);
    return { t: new Date(start).toISOString(), visits: inB.length, uniques: new Set(inB.map(uniqKey)).size };
  });

  return {
    range,
    kpis: {
      total_visits: { value: cur.length, delta_pct: delta(cur.length, prev.length) },
      unique_visitors: { value: curUniq, delta_pct: delta(curUniq, prevUniq) },
      signed_in_ratio: { value: cur.length ? Math.round((signedIn / cur.length) * 100) / 100 : 0, signed_in: signedIn, anonymous },
      live_now: { value: liveNow },
      top_country: { country: top?.country ?? null, country_code: top?.code ?? null, value: top?.n ?? 0 },
    },
    series: {
      visits_over_time: series,
      by_country: byCountry.slice(0, 12).map((c) => ({ country: c.country, country_code: c.code, value: c.n })),
      by_device: [...deviceCounts.entries()].map(([device, value]) => ({ device, value })).sort((a, b) => b.value - a.value),
      by_referrer: [...refCounts.entries()].map(([source, value]) => ({ source, value })).sort((a, b) => b.value - a.value).slice(0, 6),
      by_geo: [...geoAgg.values()],
    },
  };
}

export type ListParams = { limit?: number; offset?: number; signedIn?: boolean; country?: string; device?: string; eventType?: string; search?: string; since?: string };

export async function listEvents(p: ListParams): Promise<{ items: EventDTO[]; total: number }> {
  const conds: SQL[] = [];
  if (p.signedIn === true) conds.push(isNotNull(events.userId));
  if (p.signedIn === false) conds.push(isNull(events.userId));
  if (p.country) conds.push(eq(events.countryCode, p.country));
  if (p.device) conds.push(eq(events.deviceType, p.device as 'desktop'));
  if (p.eventType) conds.push(eq(events.eventType, p.eventType as 'page_view'));
  if (p.since) conds.push(gt(events.createdAt, new Date(p.since)));
  if (p.search) {
    const s = `%${p.search}%`;
    const clause = or(ilike(events.path, s), ilike(events.city, s), ilike(events.country, s), ilike(events.ip, s), ilike(users.name, s), ilike(users.email, s));
    if (clause) conds.push(clause);
  }
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db.select({ e: events, uName: users.name, uEmail: users.email }).from(events).leftJoin(users, eq(events.userId, users.id)).where(where).orderBy(desc(events.createdAt)).limit(Math.min(100, p.limit ?? 25)).offset(Math.max(0, p.offset ?? 0));
  const totalRes = await db.select({ c: sql<number>`count(*)::int` }).from(events).leftJoin(users, eq(events.userId, users.id)).where(where);
  return { items: rows.map((r) => toEventDTO(r.e, r.uName, r.uEmail)), total: totalRes[0]?.c ?? 0 };
}
