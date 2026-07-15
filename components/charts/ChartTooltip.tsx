'use client';
type P = { active?: boolean; payload?: Array<{ name?: string; value?: number | string }>; label?: string | number; fmt?: (v: string | number) => string };
export function ChartTooltip({ active, payload, label, fmt }: P) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass" style={{ padding: '.5rem .7rem', fontSize: '.75rem', minWidth: 120 }}>
      {label != null && <div className="text-mute" style={{ marginBottom: 4 }}>{fmt ? fmt(label) : label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          <span className="text-dim">{p.name}</span><span className="mono">{p.value}</span>
        </div>
      ))}
    </div>
  );
}
