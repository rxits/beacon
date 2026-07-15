'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function sessionId(): string | null {
  try {
    let s = localStorage.getItem('beacon_sid');
    if (!s) { s = 'sess_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('beacon_sid', s); }
    return s;
  } catch { return null; }
}

type Hint = { ip: string; city?: string; region?: string; country?: string; countryCode?: string; latitude?: number; longitude?: number };

async function resolveHint(): Promise<Hint | null> {
  try {
    const cached = sessionStorage.getItem('beacon_geo');
    if (cached) return JSON.parse(cached);
    const r = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(4500) });
    const j = await r.json();
    if (!j?.success || !j.ip) return null;
    const hint: Hint = { ip: j.ip, city: j.city, region: j.region, country: j.country, countryCode: j.country_code, latitude: j.latitude, longitude: j.longitude };
    sessionStorage.setItem('beacon_geo', JSON.stringify(hint));
    return hint;
  } catch { return null; }
}

export function BeaconTracker() {
  const path = usePathname();
  useEffect(() => {
    if (path?.startsWith('/api')) return;
    (async () => {
      const hint = await resolveHint();
      const body: Record<string, unknown> = { path, referrer: document.referrer || null, eventType: 'page_view', sessionId: sessionId() };
      if (hint) { body.ipHint = hint.ip; body.geoHint = { city: hint.city, region: hint.region, country: hint.country, countryCode: hint.countryCode, latitude: hint.latitude, longitude: hint.longitude }; }
      fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
    })();
  }, [path]);
  return null;
}
