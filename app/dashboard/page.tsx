'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRange } from '@/components/dashboard/dashboard-context';
import type { StatsResponse } from '@/lib/queries';
import { KpiTile } from '@/components/dashboard/KpiTile';
import { PageHeading } from '@/components/dashboard/PageHeading';
import { GlassPanel } from '@/components/GlassPanel';
import { VisitsChart } from '@/components/charts/VisitsChart';
import { WorldMap } from '@/components/charts/WorldMap';
import { BreakdownChart } from '@/components/charts/BreakdownChart';
import { ActivityTable } from '@/components/dashboard/ActivityTable';
import { flag } from '@/lib/format';

export default function Overview() {
  const { range } = useRange();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  useEffect(() => {
    let ok = true;
    fetch(`/api/stats?range=${range}`).then((r) => r.json()).then((d) => ok && setStats(d)).catch(() => {});
    return () => { ok = false; };
  }, [range]);
  const k = stats?.kpis;
  const visitsSpark = stats?.series.visits_over_time.map((p) => p.visits) ?? [];
  const uniqSpark = stats?.series.visits_over_time.map((p) => p.uniques) ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <PageHeading title="Overview" subtitle="Live traffic across your property" />
      <div className="kpi-grid">
        <KpiTile label="Total visits" value={k?.total_visits.value ?? 0} deltaPct={k?.total_visits.delta_pct} spark={visitsSpark} />
        <KpiTile label="Unique visitors" value={k?.unique_visitors.value ?? 0} deltaPct={k?.unique_visitors.delta_pct} spark={uniqSpark} />
        <KpiTile label="Signed in" value={Math.round((k?.signed_in_ratio.value ?? 0) * 100)} suffix="%" />
        <KpiTile label="Live now" value={k?.live_now.value ?? 0} />
        <GlassPanel hoverable className="glass-2" style={{ padding: '1.1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '.7rem', minHeight: 128, justifyContent: 'space-between' }}>
          <span style={{ fontSize: '.72rem', letterSpacing: '.04em', textTransform: 'uppercase' }} className="text-mute">Top country</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.7rem' }}>{flag(k?.top_country.country_code ?? null)}</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 620, letterSpacing: '-0.01em' }}>{k?.top_country.country ?? '—'}</span>
            </div>
            <span className="mono text-mute" style={{ fontSize: '.75rem' }}>{k?.top_country.value ?? 0} visits</span>
          </div>
        </GlassPanel>
      </div>

      <div className="chart-row">
        <Panel title="Visits over time" subtitle={`Solid = visits · dashed = unique · ${range}`}>
          <VisitsChart data={stats?.series.visits_over_time ?? []} range={range} />
        </Panel>
        <Panel title="Breakdown" subtitle="Device mix & top sources">
          <BreakdownChart devices={stats?.series.by_device ?? []} referrers={stats?.series.by_referrer ?? []} />
        </Panel>
      </div>

      <Panel title="Where visitors are" subtitle="Visit density by country — darker = more traffic">
        <WorldMap data={stats?.series.by_country ?? []} />
      </Panel>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
          <h2 style={{ fontSize: '.95rem', fontWeight: 600 }}>Live activity</h2>
          <span className="text-mute" style={{ fontSize: '.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="live-dot" /> streaming</span>
        </div>
        <ActivityTable compact />
      </div>

      <style>{`
        .kpi-grid{ display:grid; grid-template-columns:repeat(5,1fr); gap:1rem }
        .chart-row{ display:grid; grid-template-columns:1.7fr 1fr; gap:1rem }
        @media(max-width:1100px){ .kpi-grid{ grid-template-columns:repeat(2,1fr) } .chart-row{ grid-template-columns:1fr } }
        @media(max-width:560px){ .kpi-grid{ grid-template-columns:1fr } }
      `}</style>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <GlassPanel style={{ padding: '1.1rem 1.2rem' }}>
      <div style={{ marginBottom: '.9rem' }}>
        <h2 style={{ fontSize: '.95rem', fontWeight: 600 }}>{title}</h2>
        {subtitle && <p className="text-mute" style={{ fontSize: '.75rem', marginTop: 1 }}>{subtitle}</p>}
      </div>
      {children}
    </GlassPanel>
  );
}
