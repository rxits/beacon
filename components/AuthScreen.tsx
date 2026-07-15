'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { loginAction, signupAction, googleAction, guestAction, type AuthState } from '@/lib/actions';
import { Logo } from './Logo';

export function AuthScreen({ mode, enableGoogle }: { mode: 'login' | 'signup'; enableGoogle: boolean }) {
  const action = mode === 'login' ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', placeItems: 'center', padding: '1.5rem' }}>
      <div className="auth-wrap" style={{ display: 'grid', gap: '2rem', width: '100%', maxWidth: 980, gridTemplateColumns: '1.1fr 1fr', alignItems: 'center' }}>
        <section className="auth-brand" style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem', padding: '1rem' }}>
          <Logo size={30} />
          <div style={{ position: 'relative', height: 200, display: 'grid', placeItems: 'center' }} aria-hidden>
            <span style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--a2)', animation: 'ping-ring 3s ease-out infinite' }} />
            <span style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--a3)', animation: 'ping-ring 3s ease-out infinite 1s' }} />
            <span style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--a1)', animation: 'ping-ring 3s ease-out infinite 2s' }} />
            <span className="live-dot" style={{ width: 12, height: 12, background: 'var(--grad)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 680, letterSpacing: '-0.03em', lineHeight: 1.1 }}>A dashboard that <span className="grad-text">watches itself.</span></h1>
            <p className="text-dim" style={{ marginTop: '.8rem', fontSize: '.95rem', lineHeight: 1.6, maxWidth: 380 }}>
              Every visit becomes a live event — who, where, and on what device. Sign in to watch the stream in real time.
            </p>
          </div>
        </section>

        <section className="glass" style={{ padding: '1.8rem' }}>
          <div style={{ display: 'flex', gap: '.4rem', marginBottom: '1.4rem', padding: 4, border: '1px solid var(--border)', borderRadius: 12 }}>
            <Link href="/login" className="btn" style={tabStyle(mode === 'login')}>Sign in</Link>
            <Link href="/signup" className="btn" style={tabStyle(mode === 'signup')}>Create account</Link>
          </div>

          <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
            {mode === 'signup' && <label style={labelStyle}>Name<input name="name" required className="input" placeholder="Ada Lovelace" autoComplete="name" /></label>}
            <label style={labelStyle}>Email<input name="email" type="email" required className="input" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label style={labelStyle}>Password<input name="password" type="password" required className="input" placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            {state?.error && <p role="alert" style={{ fontSize: '.8rem', background: 'color-mix(in oklab, var(--text) 8%, transparent)', padding: '.55rem .7rem', borderRadius: 10 }}>{state.error}</p>}
            <button type="submit" className="btn btn-primary" disabled={pending} style={{ marginTop: '.3rem', padding: '.7rem' }}>{pending ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', margin: '.9rem 0', color: 'var(--text-mute)', fontSize: '.72rem' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} /> or <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form action={guestAction}><button type="submit" className="btn" style={{ width: '100%', padding: '.7rem' }}>Continue as guest</button></form>
          {enableGoogle && <form action={googleAction} style={{ marginTop: '.6rem' }}><button type="submit" className="btn" style={{ width: '100%', padding: '.7rem' }}>Continue with Google</button></form>}

          {mode === 'login' && (
            <button type="button" onClick={() => { setEmail('demo@beacon.local'); setPassword('demo1234'); }} className="text-mute" style={{ marginTop: '1rem', fontSize: '.78rem', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
              Use demo account · <span className="mono">demo@beacon.local / demo1234</span>
            </button>
          )}
        </section>
      </div>
      <style>{`@media (max-width: 800px){ .auth-wrap{ grid-template-columns: minmax(0,1fr) !important; max-width: 420px !important; } .auth-brand{ text-align:center; align-items:center; } }`}</style>
    </main>
  );
}

const labelStyle = { display: 'flex', flexDirection: 'column', gap: '.4rem', fontSize: '.78rem', color: 'var(--text-dim)', fontWeight: 500 } as const;
function tabStyle(active: boolean) {
  return { flex: 1, border: 'none', background: active ? 'var(--accent)' : 'transparent', color: active ? 'var(--accent-contrast)' : 'var(--text-dim)', fontWeight: active ? 600 : 500 } as const;
}
