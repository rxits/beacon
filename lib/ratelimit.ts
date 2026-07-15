// ponytail: in-memory per-instance token bucket. Swap for Redis if multi-instance.
const buckets = new Map<string, { tokens: number; ts: number }>();

export function rateLimit(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: limit, ts: now };
  b.tokens = Math.min(limit, b.tokens + ((now - b.ts) / windowMs) * limit);
  b.ts = now;
  if (b.tokens < 1) { buckets.set(key, b); return false; }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}
