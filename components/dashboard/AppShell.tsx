'use client';
import { useState, type ReactNode } from 'react';
import { RangeProvider } from './dashboard-context';
import { LiveFeedProvider } from './live-feed';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ user, children }: { user: { name: string | null; email: string | null }; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <RangeProvider>
      <LiveFeedProvider>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Header user={user} onMenu={() => setMobileOpen(true)} />
            <main style={{ padding: '1.4rem clamp(1rem, 3vw, 1.8rem)', flex: 1, maxWidth: 1440, width: '100%', margin: '0 auto' }}>{children}</main>
          </div>
        </div>
      </LiveFeedProvider>
    </RangeProvider>
  );
}
