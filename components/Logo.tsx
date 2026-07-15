export function Logo({ size = 22, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--text)' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none" />
        <path d="M7.6 7.6a6.3 6.3 0 0 0 0 8.8M16.4 7.6a6.3 6.3 0 0 1 0 8.8" opacity="0.85" />
        <path d="M4.8 4.8a10.2 10.2 0 0 0 0 14.4M19.2 4.8a10.2 10.2 0 0 1 0 14.4" opacity="0.45" />
      </svg>
      {showText && <span style={{ fontWeight: 650, letterSpacing: '-0.02em', fontSize: size * 0.8 }}>Beacon</span>}
    </span>
  );
}
