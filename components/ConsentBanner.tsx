'use client';
import { useEffect, useState } from 'react';

export function ConsentBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => { try { setShow(!localStorage.getItem('beacon_consent')); } catch {} }, []);
  if (!show) return null;
  function dismiss() { try { localStorage.setItem('beacon_consent', '1'); } catch {} setShow(false); }
  return (
    <div role="dialog" aria-label="Analytics notice" className="glass" style={{ position: 'fixed', bottom: 16, left: 16, right: 16, maxWidth: 520, margin: '0 auto', padding: '.9rem 1rem', zIndex: 50, display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <p style={{ fontSize: '.8rem', lineHeight: 1.5 }} className="text-dim">
        This page records anonymized visit analytics — hashed IP, device, and approximate location — to power the live dashboard.
      </p>
      <button onClick={dismiss} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Got it</button>
    </div>
  );
}
