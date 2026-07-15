// Real public IP = the trusted right-most x-forwarded-for entry.
// The left-most entries are client-controlled and spoofable.
export function clientIpFromHeaders(h: Headers): string {
  const xff = h.get('x-forwarded-for');
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? '1'));
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[Math.max(0, parts.length - hops)];
  }
  return h.get('x-real-ip') ?? '127.0.0.1';
}
