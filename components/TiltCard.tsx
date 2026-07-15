'use client';
import { useRef, type ReactNode } from 'react';

export function TiltCard({ children, max = 6 }: { children: ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(720px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateZ(0)`;
  }
  function reset() { if (ref.current) ref.current.style.transform = ''; }
  return <div ref={ref} className="tilt" onMouseMove={onMove} onMouseLeave={reset} style={{ height: '100%' }}>{children}</div>;
}
