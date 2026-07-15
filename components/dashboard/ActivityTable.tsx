'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveFeed } from './live-feed';
import type { EventDTO } from '@/lib/dto';
import { flag, rel } from '@/lib/format';
import { GlassPanel } from '@/components/GlassPanel';

const th = { textAlign: 'left', padding: '.6rem .9rem', fontSize: '.68rem', letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-mute)', fontWeight: 500, whiteSpace: 'nowrap' } as const;
const td = { padding: '.6rem .9rem', fontSize: '.82rem', borderTop: '1px solid var(--border)', whiteSpace: 'nowrap' } as const;

export function ActivityTable({ compact = false }: { compact?: boolean }) {
  const { live } = useLiveFeed();
  const [items, setItems] = useState<EventDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [identity, setIdentity] = useState<'all' | 'user' | 'anonymous'>('all');
  const [search, setSearch] = useState('');
  const limit = compact ? 8 : 14;

  const load = useCallback(async () => {
    const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (identity !== 'all') p.set('identity', identity);
    if (search) p.set('search', search);
    try { const r = await fetch(`/api/events?${p}`); const j = await r.json(); setItems(j.items ?? []); setTotal(j.total ?? 0); } catch {}
  }, [limit, offset, identity, search]);
  useEffect(() => { load(); }, [load]);

  const atTop = offset === 0 && identity === 'all' && !search;
  const rows = useMemo(() => {
    if (!atTop && !compact) return items.map((e) => ({ e, fresh: false }));
    const seen = new Set(items.map((i) => i.id));
    const fresh = live.filter((l) => !seen.has(l.id));
    return [...fresh.map((e) => ({ e, fresh: true })), ...items.map((e) => ({ e, fresh: false }))].slice(0, compact ? 9 : limit + fresh.length);
  }, [items, live, atTop, compact, limit]);

  return (
    <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
      {!compact && (
        <div style={{ display: 'flex', gap: '.6rem', padding: '.8rem .9rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div role="tablist" style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
            {(['all', 'user', 'anonymous'] as const).map((f) => (
              <button key={f} role="tab" aria-selected={identity === f} onClick={() => { setIdentity(f); setOffset(0); }}
                style={{ padding: '.3rem .6rem', fontSize: '.75rem', borderRadius: 7, border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                  background: identity === f ? 'var(--accent)' : 'transparent', color: identity === f ? 'var(--accent-contrast)' : 'var(--text-dim)', fontWeight: identity === f ? 600 : 500 }}>{f}</button>
            ))}
          </div>
          <input className="input" placeholder="Search path, city, user…" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} style={{ maxWidth: 260, height: 34, marginLeft: 'auto' }} />
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>When</th><th style={th}>Who</th><th style={th}>Where</th><th style={th}>Device</th><th style={th}>Path</th><th style={th}>Source</th>
          </tr></thead>
          <tbody>
            {rows.map(({ e, fresh }) => (
              <tr key={e.id} className={fresh ? 'row-new' : undefined}>
                <td style={td}><span className="text-dim mono" style={{ fontSize: '.75rem' }}>{rel(e.createdAt)}</span></td>
                <td style={td}>
                  {e.identity === 'user'
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Avatar name={e.user?.name ?? e.user?.email ?? '?'} />{e.user?.name ?? e.user?.email}</span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} className="text-dim"><Avatar name="?" anon /><span>Anonymous <span className="mono text-mute" style={{ fontSize: '.7rem' }}>{e.ip ?? '#' + e.anonId}</span></span></span>}
                </td>
                <td style={td}><span className="text-dim">{flag(e.location.countryCode)} {e.location.city ?? e.location.country ?? 'Local'}</span></td>
                <td style={td}><span className="text-dim">{e.device.browser ?? '—'}{e.device.os ? ` · ${e.device.os}` : ''}</span></td>
                <td style={td}><span className="mono" style={{ fontSize: '.76rem' }}>{e.path}</span></td>
                <td style={td}><span className="text-mute" style={{ fontSize: '.76rem' }}>{sourceHost(e.referrer)}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td style={td} colSpan={6}><span className="text-mute">No activity yet.</span></td></tr>}
          </tbody>
        </table>
      </div>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.7rem .9rem', borderTop: '1px solid var(--border)' }}>
          <span className="text-mute" style={{ fontSize: '.76rem' }}>{total.toLocaleString()} events</span>
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button className="btn" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - limit))} style={{ padding: '.35rem .7rem', fontSize: '.78rem', opacity: offset === 0 ? .4 : 1 }}>Prev</button>
            <button className="btn" disabled={offset + limit >= total} onClick={() => setOffset((o) => o + limit)} style={{ padding: '.35rem .7rem', fontSize: '.78rem', opacity: offset + limit >= total ? .4 : 1 }}>Next</button>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

function Avatar({ name, anon = false }: { name: string; anon?: boolean }) {
  const initials = anon ? '~' : name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return <span style={{ width: 24, height: 24, borderRadius: 7, display: 'grid', placeItems: 'center', fontSize: '.66rem', fontWeight: 600, background: anon ? 'transparent' : 'var(--accent)', color: anon ? 'var(--text-mute)' : 'var(--accent-contrast)', border: anon ? '1px dashed var(--border-2)' : 'none' }}>{initials}</span>;
}
function sourceHost(r: string | null): string {
  if (!r) return 'Direct';
  try { return new URL(r).hostname.replace(/^www\./, ''); } catch { return 'Direct'; }
}
