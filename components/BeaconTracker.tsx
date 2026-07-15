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

export function BeaconTracker() {
  const path = usePathname();
  useEffect(() => {
    if (path?.startsWith('/api')) return;
    fetch('/api/track', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path, referrer: document.referrer || null, eventType: 'page_view', sessionId: sessionId() }),
      keepalive: true,
    }).catch(() => {});
  }, [path]);
  return null;
}
