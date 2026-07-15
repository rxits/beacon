'use client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

type DeviceRow = { device: string; value: number };
type RefRow = { source: string; value: number };

export function BreakdownChart({ devices, referrers }: { devices: DeviceRow[]; referrers: RefRow[] }) {
  const total = devices.reduce((s, d) => s + d.value, 0) || 1;
  const opacities = [1, 0.62, 0.4, 0.24, 0.14];
  const refMax = Math.max(1, ...referrers.map((r) => r.value));
  return (
    <div style={{ color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 128, height: 128, position: 'relative', flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={devices} dataKey="value" nameKey="device" innerRadius={40} outerRadius={62} paddingAngle={2} stroke="var(--bg)" strokeWidth={2}>
                {devices.map((_, i) => <Cell key={i} fill="currentColor" fillOpacity={opacities[i % opacities.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center' }}><div className="mono" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{total}</div><div className="text-mute" style={{ fontSize: '.62rem' }}>events</div></div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', flex: 1 }}>
          {devices.map((d, i) => (
            <div key={d.device} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.78rem' }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: 'currentColor', opacity: opacities[i % opacities.length] }} />
              <span className="text-dim" style={{ textTransform: 'capitalize' }}>{d.device}</span>
              <span className="mono" style={{ marginLeft: 'auto' }}>{Math.round((d.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        <div className="text-mute" style={{ fontSize: '.68rem', letterSpacing: '.04em', textTransform: 'uppercase' }}>Top sources</div>
        {referrers.map((r) => (
          <div key={r.source} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontSize: '.78rem' }}>
            <span style={{ width: 92, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="text-dim">{r.source}</span>
            <div style={{ flex: 1, height: 6, background: 'color-mix(in oklab, currentColor 8%, transparent)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(r.value / refMax) * 100}%`, height: '100%', background: 'currentColor', opacity: 0.75, borderRadius: 4 }} />
            </div>
            <span className="mono text-dim" style={{ width: 32, textAlign: 'right' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
