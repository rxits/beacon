'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { href: '/dashboard/activity', label: 'Activity', icon: 'M3 12h4l3 8 4-16 3 8h4' },
  { href: '/dashboard/users', label: 'Users', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9' },
  { href: '/dashboard/map', label: 'Map', icon: 'M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z' },
];

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const path = usePathname();
  return (
    <>
      {mobileOpen && <div onClick={onClose} className="sidebar-scrim" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />}
      <aside className={`sidebar glass ${mobileOpen ? 'open' : ''}`} style={{ width: 232, flexShrink: 0, padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '.4rem', borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
        <div style={{ padding: '.4rem .5rem 1.1rem' }}><Logo size={22} /></div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((n) => {
            const active = n.href === '/dashboard' ? path === n.href : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} onClick={onClose} aria-current={active ? 'page' : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.6rem .7rem', borderRadius: 11, fontSize: '.88rem',
                  color: active ? 'var(--accent-contrast)' : 'var(--text-dim)', background: active ? 'var(--accent)' : 'transparent',
                  fontWeight: active ? 600 : 500, transition: 'background .18s, color .18s' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ marginTop: 'auto', fontSize: '.7rem' }} className="text-mute">
          <div style={{ padding: '.5rem', borderTop: '1px solid var(--border)' }}>Beacon · localhost</div>
        </div>
      </aside>
      <style>{`.sidebar{position:sticky;top:0;height:100vh}
        @media (max-width: 900px){ .sidebar{ position:fixed; left:0; top:0; height:100vh; z-index:41; transform:translateX(-105%); transition:transform .25s ease } .sidebar.open{ transform:translateX(0) } }
        @media (min-width: 901px){ .sidebar-scrim{ display:none } }`}</style>
    </>
  );
}
