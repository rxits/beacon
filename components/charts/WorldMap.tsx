'use client';
import { useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import worldData from 'world-atlas/countries-110m.json';

const ALIAS: Record<string, string> = {
  'United States': 'United States of America', 'United Kingdom': 'United Kingdom', 'Germany': 'Germany',
  'India': 'India', 'Canada': 'Canada', 'Australia': 'Australia', 'Japan': 'Japan', 'Singapore': 'Singapore',
  'France': 'France', 'Brazil': 'Brazil', 'Netherlands': 'Netherlands', 'United Arab Emirates': 'United Arab Emirates', 'Nigeria': 'Nigeria',
};
type Row = { country: string | null; country_code: string | null; value: number };

export function WorldMap({ data, height = 400 }: { data: Row[]; height?: number }) {
  const byName = new Map<string, number>();
  let max = 1;
  for (const d of data ?? []) {
    const name = ALIAS[d.country ?? ''] ?? d.country ?? '';
    if (name) { byName.set(name, d.value); max = Math.max(max, d.value); }
  }
  const [hover, setHover] = useState<{ name: string; value: number } | null>(null);
  return (
    <div style={{ color: 'var(--text)', position: 'relative', width: '100%' }}>
      <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 170 }} width={860} height={height} style={{ width: '100%', height: 'auto' }}>
        <Geographies geography={worldData as object}>
          {({ geographies }: { geographies: Array<{ rsmKey: string; properties: { name: string } }> }) =>
            geographies.map((geo) => {
              const v = byName.get(geo.properties.name) ?? 0;
              const t = v ? 22 + Math.round((v / max) * 66) : 0;
              return (
                <Geography key={geo.rsmKey} geography={geo}
                  onMouseEnter={() => setHover({ name: geo.properties.name, value: v })}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    default: { fill: v ? `color-mix(in oklab, #22d3ee ${t}%, transparent)` : 'color-mix(in oklab, currentColor 7%, transparent)', stroke: 'var(--bg)', strokeWidth: 0.4, outline: 'none', transition: 'fill .2s' },
                    hover: { fill: '#38e0f5', stroke: 'var(--bg)', strokeWidth: 0.5, outline: 'none', cursor: 'pointer' },
                    pressed: { fill: '#22d3ee', outline: 'none' },
                  }} />
              );
            })}
        </Geographies>
      </ComposableMap>
      {hover && hover.value > 0 && (
        <div className="glass" style={{ position: 'absolute', top: 8, left: 8, padding: '.4rem .65rem', fontSize: '.75rem' }}>
          {hover.name} · <span className="mono">{hover.value}</span> visits
        </div>
      )}
    </div>
  );
}
