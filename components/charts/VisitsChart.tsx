'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip';

type Point = { t: string; visits: number; uniques: number };
const VISITS = '#22d3ee';
const UNIQUES = '#a78bfa';

export function VisitsChart({ data, range }: { data: Point[]; range: string }) {
  const fmt = (t: string | number) => {
    const d = new Date(t);
    return range === '24h' ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  return (
    <div style={{ color: 'var(--text)', width: '100%' }}>
      <ResponsiveContainer width="100%" height={264}>
        <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={VISITS} stopOpacity={0.35} />
              <stop offset="100%" stopColor={VISITS} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="t" tickFormatter={fmt} tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 11 }} tickLine={false} axisLine={false} width={46} allowDecimals={false} />
          <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }} />
          <Area type="monotone" dataKey="visits" name="Visits" stroke={VISITS} strokeWidth={2.4} fill="url(#visitsFill)" isAnimationActive />
          <Area type="monotone" dataKey="uniques" name="Uniques" stroke={UNIQUES} strokeWidth={1.8} strokeDasharray="4 3" fill="none" isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
