'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRange } from '@/components/dashboard/dashboard-context';
import type { StatsResponse } from '@/lib/queries';
import { Globe, type Marker } from '@/components/charts/Globe';
import { PageHeading } from '@/components/dashboard/PageHeading';
import { GlassPanel } from '@/components/GlassPanel';
import { flag } from '@/lib/format';

export default function MapPage() {
  const { range } = useRange();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  useEffect(() => {
    let ok = true;
    fetch(`/api/stats?range=${range}`).then((r) => r.json()).then((d) => ok && setStats(d)).catch(() => {});
    return () => { ok = false; };
  }, [range]);
  const countries = stats?.series.by_country ?? [];
  const markers = useMemo<Marker[]>(() => {
    const g = stats?.series.by_geo ?? [];
    const max = Math.max(1, ...g.map((x) => x.value));
    return g.map((x) => ({ location: [x.lat, x.lng] as [number, number], size: 0.04 + (x.value / max) * 0.1 }));
  }, [stats]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <PageHeading title="Map" subtitle="Global visit distribution — drag to spin the globe" />
      <div className="map-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem' }}>
        <GlassPanel style={{ padding: '1.4rem', display: 'grid', placeItems: 'center' }}><Globe markers={markers} size={520} /></GlassPanel>
        <GlassPanel style={{ padding: '1.1rem 1.2rem' }}>
          <h2 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: '.9rem' }}>Countries</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
            {countries.length === 0 && <span className="text-mute" style={{ fontSize: '.82rem' }}>No data.</span>}
            {countries.map((c) => (
              <div key={c.country_code ?? c.country} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontSize: '.83rem' }}>
                <span style={{ fontSize: '1.05rem' }}>{flag(c.country_code)}</span>
                <span className="text-dim" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.country}</span>
                <span className="mono" style={{ marginLeft: 'auto' }}>{c.value}</span>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
      <style>{`@media(max-width:900px){.map-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
