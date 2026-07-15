export function Sparkline({ data, width = 120, height = 34, color = 'var(--text)' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (!data || data.length < 2) return <svg width={width} height={height} aria-hidden />;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), span = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((d, i) => `${(i * step).toFixed(1)},${(height - ((d - min) / span) * (height - 4) - 2).toFixed(1)}`);
  const line = pts.join(' ');
  return (
    <svg width={width} height={height} aria-hidden style={{ overflow: 'visible' }}>
      <polygon points={`${line} ${width},${height} 0,${height}`} fill={color} opacity="0.12" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
