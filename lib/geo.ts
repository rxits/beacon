export type Geo = {
  country: string | null; countryCode: string | null; region: string | null;
  city: string | null; latitude: number | null; longitude: number | null;
};
const EMPTY: Geo = { country: null, countryCode: null, region: null, city: null, latitude: null, longitude: null };
const PRIVATE = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fe80|0\.)/i;

type GeoipLookup = { country?: string; region?: string; city?: string; ll?: [number, number] } | null;
let mod: { lookup(ip: string): GeoipLookup } | null | undefined;

async function getGeoip() {
  if (mod !== undefined) return mod;
  // geoip-lite preloads its .dat files on import; if the (licensed) country DB
  // is absent this throws — degrade gracefully instead of crashing ingest.
  try { mod = ((await import('geoip-lite')) as unknown as { default: { lookup(ip: string): GeoipLookup } }).default; }
  catch { mod = null; }
  return mod;
}

export async function lookupGeo(ip: string): Promise<Geo> {
  if (!ip || PRIVATE.test(ip)) return EMPTY;
  const geoip = await getGeoip();
  if (!geoip) return EMPTY;
  try {
    const g = geoip.lookup(ip);
    if (!g) return EMPTY;
    return {
      country: g.country ?? null, countryCode: g.country ?? null, region: g.region || null,
      city: g.city || null, latitude: g.ll?.[0] ?? null, longitude: g.ll?.[1] ?? null,
    };
  } catch { return EMPTY; }
}
