export function Sparkline({ data, width = 120, height = 34 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return <svg width={width} height={height} aria-hidden />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((d, i) => `${(i * step).toFixed(1)},${(height - ((d - min) / span) * (height - 4) - 2).toFixed(1)}`);
  const line = pts.join(' ');
  const area = `${line} ${width},${height} 0,${height}`;
  return (
    <svg width={width} height={height} aria-hidden style={{ overflow: 'visible' }}>
      <polygon points={area} fill="var(--text)" opacity="0.06" />
      <polyline points={line} fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
