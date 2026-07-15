'use client';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useRange, type Range } from './dashboard-context';
import { logoutAction } from '@/lib/session-actions';

const RANGES: Range[] = ['24h', '7d', '30d'];

export function Header({ user, onMenu }: { user: { name: string | null; email: string | null }; onMenu: () => void }) {
  const { range, setRange } = useRange();
  const [menu, setMenu] = useState(false);
  const initials = (user.name ?? user.email ?? '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <header className="glass" style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', gap: '.8rem', padding: '.7rem 1.2rem', borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
      <button className="btn only-mobile" onClick={onMenu} aria-label="Open menu" style={{ padding: '.45rem', width: 38, height: 38 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>
      <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: .5 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <input className="input" placeholder="Search activity…" aria-label="Search" style={{ paddingLeft: 34, height: 38 }} />
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', padding: '.35rem .6rem', border: '1px solid var(--border)', borderRadius: 10, fontSize: '.72rem' }} className="text-dim only-desktop">
          <span className="live-dot" /> Live
        </div>
        <div role="tablist" aria-label="Date range" style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }} className="only-desktop">
          {RANGES.map((r) => (
            <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)}
              style={{ padding: '.3rem .6rem', fontSize: '.75rem', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: range === r ? 'var(--accent)' : 'transparent', color: range === r ? 'var(--accent-contrast)' : 'var(--text-dim)', fontWeight: range === r ? 600 : 500 }} className="mono">{r}</button>
          ))}
        </div>
        <ThemeToggle />
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenu((m) => !m)} aria-label="Account" style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border-2)', background: 'var(--accent)', color: 'var(--accent-contrast)', fontWeight: 600, fontSize: '.78rem', cursor: 'pointer' }}>{initials}</button>
          {menu && (
            <div className="glass" style={{ position: 'absolute', right: 0, top: 46, width: 220, padding: '.6rem', zIndex: 40 }}>
              <div style={{ padding: '.5rem .6rem' }}>
                <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{user.name ?? 'Signed in'}</div>
                <div className="text-mute" style={{ fontSize: '.75rem' }}>{user.email}</div>
              </div>
              <form action={logoutAction}><button type="submit" className="btn" style={{ width: '100%', marginTop: '.3rem' }}>Log out</button></form>
            </div>
          )}
        </div>
      </div>
      <style>{`.only-mobile{display:none}@media(max-width:900px){.only-mobile{display:inline-flex}.only-desktop{display:none!important}}`}</style>
    </header>
  );
}
