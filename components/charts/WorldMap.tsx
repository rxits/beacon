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

export function WorldMap({ data, height = 380 }: { data: Row[]; height?: number }) {
  const byName = new Map<string, number>();
  let max = 1;
  for (const d of data ?? []) {
    const name = ALIAS[d.country ?? ''] ?? d.country ?? '';
    if (name) { byName.set(name, d.value); max = Math.max(max, d.value); }
  }
  const [hover, setHover] = useState<{ name: string; value: number } | null>(null);
  return (
    <div style={{ color: 'var(--text)', position: 'relative', width: '100%' }}>
      <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 165 }} width={860} height={height} style={{ width: '100%', height: 'auto' }}>
        <Geographies geography={worldData as object}>
          {({ geographies }: { geographies: Array<{ rsmKey: string; properties: { name: string } }> }) =>
            geographies.map((geo) => {
              const v = byName.get(geo.properties.name) ?? 0;
              const t = v ? 12 + Math.round((v / max) * 72) : 0;
              return (
                <Geography key={geo.rsmKey} geography={geo}
                  onMouseEnter={() => setHover({ name: geo.properties.name, value: v })}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    default: { fill: v ? `color-mix(in oklab, currentColor ${t}%, transparent)` : 'color-mix(in oklab, currentColor 5%, transparent)', stroke: 'var(--bg)', strokeWidth: 0.4, outline: 'none' },
                    hover: { fill: 'currentColor', stroke: 'var(--bg)', strokeWidth: 0.5, outline: 'none', cursor: 'pointer' },
                    pressed: { fill: 'currentColor', outline: 'none' },
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
