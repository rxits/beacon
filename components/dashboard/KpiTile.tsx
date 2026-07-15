'use client';
import { GlassPanel } from '@/components/GlassPanel';
import { CountUp } from '@/components/CountUp';
import { Sparkline } from '@/components/Sparkline';
import { TiltCard } from '@/components/TiltCard';

export function KpiTile({ label, value, deltaPct, spark, suffix, format, accent = 'var(--a2)' }: {
  label: string; value: number; deltaPct?: number | null; spark?: number[]; suffix?: string; format?: (n: number) => string; accent?: string;
}) {
  const up = (deltaPct ?? 0) >= 0;
  return (
    <TiltCard>
      <GlassPanel hoverable className="glass-2" style={{ padding: '1.1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '.7rem', minHeight: 128, height: '100%', position: 'relative', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent, opacity: 0.75 }} />
        <span style={{ position: 'absolute', top: -34, right: -34, width: 116, height: 116, borderRadius: '50%', background: accent, filter: 'blur(48px)', opacity: 0.2, pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '.72rem', letterSpacing: '.04em', textTransform: 'uppercase' }} className="text-mute">{label}</span>
          {deltaPct != null && <span className="mono" style={{ fontSize: '.7rem', color: up ? 'var(--up)' : 'var(--down)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>{up ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(1)}%</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '.5rem', flex: 1 }}>
          <span style={{ fontSize: '2rem', fontWeight: 640, letterSpacing: '-0.02em', lineHeight: 1 }}><CountUp value={value} format={format} />{suffix}</span>
          {spark && spark.length > 1 && <Sparkline data={spark} color={accent} />}
        </div>
      </GlassPanel>
    </TiltCard>
  );
}
