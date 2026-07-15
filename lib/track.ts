import { db } from '@/db';
import { events } from '@/db/schema';
import { clientIpFromHeaders } from './ip';
import { hashIp } from './hash';
import { lookupGeo } from './geo';
import { parseUa } from './ua';

export type TrackInput = {
  path: string;
  referrer?: string | null;
  eventType?: 'page_view' | 'login' | 'signup' | 'click';
  sessionId?: string | null;
  userId?: string | null;
};

export async function recordEvent(headers: Headers, input: TrackInput): Promise<void> {
  const ip = clientIpFromHeaders(headers);
  const geo = await lookupGeo(ip);
  const device = parseUa(headers.get('user-agent'));
  const mode = process.env.IP_STORAGE_MODE ?? 'hashed';
  await db.insert(events).values({
    sessionId: input.sessionId ?? null,
    userId: input.userId ?? null,
    ip: mode === 'raw' ? ip : null,
    ipHash: hashIp(ip),
    country: geo.country, countryCode: geo.countryCode, region: geo.region,
    city: geo.city, latitude: geo.latitude, longitude: geo.longitude,
    browser: device.browser, os: device.os, deviceType: device.deviceType,
    path: input.path, referrer: input.referrer ?? null,
    eventType: input.eventType ?? 'page_view',
  });
}
