import type { Event } from '@/db/schema';

export type EventDTO = {
  id: string;
  createdAt: string;
  eventType: string;
  path: string | null;
  referrer: string | null;
  identity: 'user' | 'anonymous';
  user: { name: string | null; email: string | null } | null;
  anonId: string | null;
  location: {
    city: string | null; region: string | null; country: string | null;
    countryCode: string | null; latitude: number | null; longitude: number | null;
  };
  device: { browser: string | null; os: string | null; deviceType: string | null };
};

export function toEventDTO(e: Event, uName?: string | null, uEmail?: string | null): EventDTO {
  const anon = !e.userId;
  return {
    id: e.id,
    createdAt: new Date(e.createdAt as unknown as string).toISOString(),
    eventType: e.eventType,
    path: e.path,
    referrer: e.referrer,
    identity: anon ? 'anonymous' : 'user',
    user: anon ? null : { name: uName ?? null, email: uEmail ?? null },
    anonId: anon ? (e.ipHash ? e.ipHash.slice(0, 8) : null) : null,
    location: {
      city: e.city, region: e.region, country: e.country,
      countryCode: e.countryCode, latitude: e.latitude, longitude: e.longitude,
    },
    device: { browser: e.browser, os: e.os, deviceType: e.deviceType },
  };
}
