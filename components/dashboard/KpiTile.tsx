'use client';
import { GlassPanel } from '@/components/GlassPanel';
import { CountUp } from '@/components/CountUp';
import { Sparkline } from '@/components/Sparkline';

export function KpiTile({ label, value, deltaPct, spark, suffix, format }: {
  label: string; value: number; deltaPct?: number | null; spark?: number[]; suffix?: string; format?: (n: number) => string;
}) {
  const up = (deltaPct ?? 0) >= 0;
  return (
    <GlassPanel hoverable className="glass-2" style={{ padding: '1.1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '.7rem', minHeight: 128 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '.72rem', letterSpacing: '.04em', textTransform: 'uppercase' }} className="text-mute">{label}</span>
        {deltaPct != null && (
          <span className="mono" style={{ fontSize: '.7rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {up ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(1)}%
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '.5rem', flex: 1 }}>
        <span style={{ fontSize: '2rem', fontWeight: 640, letterSpacing: '-0.02em', lineHeight: 1 }}>
          <CountUp value={value} format={format} />{suffix}
        </span>
        {spark && spark.length > 1 && <Sparkline data={spark} />}
      </div>
    </GlassPanel>
  );
}
