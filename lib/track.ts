import { db } from '@/db';
import { events } from '@/db/schema';
import { clientIpFromHeaders, isPrivateIp, isPublicIp } from './ip';
import { hashIp } from './hash';
import { lookupGeo, type Geo } from './geo';
import { parseUa } from './ua';

export type TrackInput = {
  path: string;
  referrer?: string | null;
  eventType?: 'page_view' | 'login' | 'signup' | 'click';
  sessionId?: string | null;
  userId?: string | null;
  ipHint?: string | null;
  localIp?: string | null;
  geoHint?: { city?: string | null; region?: string | null; country?: string | null; countryCode?: string | null; latitude?: number | null; longitude?: number | null } | null;
};

const EMPTY_GEO: Geo = { country: null, countryCode: null, region: null, city: null, latitude: null, longitude: null };

export async function recordEvent(headers: Headers, input: TrackInput): Promise<void> {
  let ip = clientIpFromHeaders(headers);
  let geo = await lookupGeo(ip);
  if (isPrivateIp(ip) && input.ipHint && isPublicIp(input.ipHint)) {
    ip = input.ipHint;
    geo = input.geoHint ? { ...EMPTY_GEO, ...input.geoHint } : await lookupGeo(ip);
  }
  const device = parseUa(headers.get('user-agent'));
  await db.insert(events).values({
    sessionId: input.sessionId ?? null,
    userId: input.userId ?? null,
    ip,
    ipHash: hashIp(ip),
    localIp: input.localIp ?? null,
    country: geo.country, countryCode: geo.countryCode, region: geo.region,
    city: geo.city, latitude: geo.latitude, longitude: geo.longitude,
    browser: device.browser, os: device.os, deviceType: device.deviceType,
    path: input.path, referrer: input.referrer ?? null,
    eventType: input.eventType ?? 'page_view',
  });
}
