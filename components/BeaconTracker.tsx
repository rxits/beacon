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

// Best-effort private/LAN IP via WebRTC ICE candidates. Modern browsers usually
// return an mDNS ".local" placeholder instead — in that case we get nothing.
function resolveLocalIp(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const cached = sessionStorage.getItem('beacon_lip');
      if (cached) return resolve(cached === 'null' ? null : cached);
      const RTC = window.RTCPeerConnection;
      if (!RTC) return resolve(null);
      const pc = new RTC({ iceServers: [] });
      const found = new Set<string>();
      const finish = () => {
        const priv = [...found].find((ip) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip));
        const val = priv ?? [...found][0] ?? null;
        try { pc.close(); } catch {}
        sessionStorage.setItem('beacon_lip', val ?? 'null');
        resolve(val);
      };
      const timer = setTimeout(finish, 1600);
      pc.onicecandidate = (e) => {
        if (!e.candidate) { clearTimeout(timer); return finish(); }
        const m = e.candidate.candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
        if (m && !/^0\.|^127\./.test(m[1]) && !e.candidate.candidate.includes('.local')) found.add(m[1]);
      };
      pc.createDataChannel('x');
      pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => { clearTimeout(timer); finish(); });
    } catch { resolve(null); }
  });
}

export function BeaconTracker() {
  const path = usePathname();
  useEffect(() => {
    if (path?.startsWith('/api')) return;
    (async () => {
      const [hint, localIp] = await Promise.all([resolveHint(), resolveLocalIp()]);
      const body: Record<string, unknown> = { path, referrer: document.referrer || null, eventType: 'page_view', sessionId: sessionId() };
      if (localIp) body.localIp = localIp;
      if (hint) { body.ipHint = hint.ip; body.geoHint = { city: hint.city, region: hint.region, country: hint.country, countryCode: hint.countryCode, latitude: hint.latitude, longitude: hint.longitude }; }
      fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
    })();
  }, [path]);
  return null;
}
