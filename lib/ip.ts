// Real public IP = the trusted right-most x-forwarded-for entry.
// The left-most entries are client-controlled and spoofable.
const PRIVATE = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fe80|0\.|::ffff:127)/i;

export function clientIpFromHeaders(h: Headers): string {
  const xff = h.get('x-forwarded-for');
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? '1'));
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[Math.max(0, parts.length - hops)];
  }
  return h.get('x-real-ip') ?? '127.0.0.1';
}
export const isPrivateIp = (ip: string) => !ip || PRIVATE.test(ip);
export const isPublicIp = (ip: string) => !!ip && !PRIVATE.test(ip) && /[.:]/.test(ip) && ip.length <= 45;
