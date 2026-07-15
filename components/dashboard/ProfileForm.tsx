'use client';
import { useActionState } from 'react';
import { updateProfileAction, type ProfileState } from '@/lib/actions';
import { GlassPanel } from '@/components/GlassPanel';

export function ProfileForm({ name, email }: { name: string | null; email: string | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  return (
    <GlassPanel style={{ padding: '1.1rem 1.2rem' }}>
      <h2 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '.9rem' }}>Profile</h2>
      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', maxWidth: 380 }}>
        <label style={label}>Display name<input name="name" defaultValue={name ?? ''} required maxLength={80} className="input" /></label>
        <label style={label}>Email<input value={email ?? ''} disabled className="input" style={{ opacity: .6 }} /></label>
        <label style={label}>New password <span className="text-mute" style={{ fontWeight: 400 }}>(optional)</span><input name="password" type="password" placeholder="Leave blank to keep current" className="input" /></label>
        {state.error && <p role="alert" style={msg}>{state.error}</p>}
        {state.ok && <p style={{ ...msg, color: 'var(--up)' }}>Saved.</p>}
        <button type="submit" className="btn btn-primary" disabled={pending} style={{ alignSelf: 'flex-start', padding: '.55rem 1.1rem' }}>{pending ? 'Saving…' : 'Save changes'}</button>
      </form>
    </GlassPanel>
  );
}
const label = { display: 'flex', flexDirection: 'column', gap: '.35rem', fontSize: '.78rem', color: 'var(--text-dim)', fontWeight: 500 } as const;
const msg = { fontSize: '.8rem', background: 'color-mix(in oklab, var(--text) 8%, transparent)', padding: '.5rem .7rem', borderRadius: 10 } as const;
