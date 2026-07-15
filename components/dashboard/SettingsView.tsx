'use client';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GlassPanel } from '@/components/GlassPanel';

export function SettingsView({ name, email }: { name: string | null; email: string | null }) {
  function resetConsent() { try { localStorage.removeItem('beacon_consent'); location.reload(); } catch {} }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 640 }}>
      <Section title="Account"><Row label="Name" value={name ?? '—'} /><Row label="Email" value={email ?? '—'} /></Section>
      <Section title="Appearance">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="text-dim" style={{ fontSize: '.85rem' }}>Theme</span><ThemeToggle /></div>
      </Section>
      <Section title="Privacy">
        <Row label="IP storage" value="Hashed (SHA-256 + salt)" />
        <Row label="Bot filtering" value="Enabled" />
        <p className="text-mute" style={{ fontSize: '.78rem', lineHeight: 1.55 }}>Raw IP addresses are never persisted in the default configuration — only a salted hash is kept, used solely for counting unique visitors.</p>
        <button className="btn" onClick={resetConsent} style={{ alignSelf: 'flex-start' }}>Reset consent notice</button>
      </Section>
    </div>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <GlassPanel style={{ padding: '1.1rem 1.2rem' }}><h2 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '.8rem' }}>{title}</h2><div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>{children}</div></GlassPanel>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '.85rem' }}><span className="text-dim">{label}</span><span>{value}</span></div>;
}
