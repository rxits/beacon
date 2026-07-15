'use client';
import { useEffect, type MouseEvent, type ReactNode } from 'react';
import type { EventDTO } from '@/lib/dto';
import { flag, rel } from '@/lib/format';
import { GlassPanel } from '@/components/GlassPanel';

export function EventDetail({ event: e, onClose }: { event: EventDTO; onClose: () => void }) {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const loc = [e.location.city, e.location.region, e.location.country].filter(Boolean).join(', ') || 'Unknown / local';
  const coords = e.location.latitude != null ? `${e.location.latitude.toFixed(3)}, ${e.location.longitude?.toFixed(3)}` : '—';

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Visit details"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.62)', backdropFilter: 'blur(5px)', display: 'grid', placeItems: 'center', zIndex: 60, padding: '1.5rem' }}>
      <GlassPanel onClick={(ev: MouseEvent) => ev.stopPropagation()} style={{ padding: '1.4rem 1.5rem', maxWidth: 540, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 640, letterSpacing: '-0.01em' }}>
              {e.identity === 'user' ? (e.user?.name ?? 'Signed-in user') : 'Anonymous visitor'}
            </div>
            <div className="text-mute" style={{ fontSize: '.78rem' }}>{new Date(e.createdAt).toLocaleString()} · {rel(e.createdAt)}</div>
          </div>
          <button onClick={onClose} className="btn" aria-label="Close" style={{ padding: '.4rem', width: 34, height: 34 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <Group title="Identity">
          <Row k="Type" v={e.identity === 'user' ? 'Authenticated' : 'Anonymous'} />
          {e.user?.email && <Row k="Email" v={e.user.email} mono />}
        </Group>

        <Group title="Network">
          <Row k="Public IP" v={e.ip ?? '—'} mono />
          <Row k="Local / LAN IP" v={e.localIp ?? 'Hidden by browser (mDNS)'} mono dim={!e.localIp} />
          <Row k="IP hash" v={e.ipHash ? e.ipHash.slice(0, 24) + '…' : '—'} mono dim />
        </Group>

        <Group title="Location">
          <Row k="Place" v={`${flag(e.location.countryCode)}  ${loc}`} />
          <Row k="Coordinates" v={coords} mono dim />
        </Group>

        <Group title="Device">
          <Row k="Browser" v={e.device.browser ?? '—'} />
          <Row k="OS" v={e.device.os ?? '—'} />
          <Row k="Type" v={e.device.deviceType ?? '—'} />
        </Group>

        <Group title="Request">
          <Row k="Event" v={e.eventType} mono />
          <Row k="Path" v={e.path ?? '—'} mono />
          <Row k="Referrer" v={e.referrer ?? 'Direct'} mono dim={!e.referrer} />
          <Row k="Session" v={e.sessionId ?? '—'} mono dim />
        </Group>
      </GlassPanel>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div className="text-mute" style={{ fontSize: '.66rem', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '.45rem' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>{children}</div>
    </div>
  );
}
function Row({ k, v, mono, dim }: { k: string; v: string; mono?: boolean; dim?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.2rem', fontSize: '.83rem' }}>
      <span className="text-mute" style={{ flexShrink: 0 }}>{k}</span>
      <span className={mono ? 'mono' : ''} style={{ textAlign: 'right', wordBreak: 'break-all', color: dim ? 'var(--text-mute)' : 'var(--text)' }}>{v}</span>
    </div>
  );
}
