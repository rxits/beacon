import { describe, it, expect, beforeEach } from 'vitest';
import { clientIpFromHeaders } from './ip';
import { hashIp } from './hash';
import { parseUa, isBot } from './ua';

const H = (h: Record<string, string>) => new Headers(h);

describe('clientIpFromHeaders (spoof-resistant)', () => {
  beforeEach(() => { process.env.TRUSTED_PROXY_HOPS = '1'; });
  it('returns a single XFF entry', () => {
    expect(clientIpFromHeaders(H({ 'x-forwarded-for': '203.0.113.5' }))).toBe('203.0.113.5');
  });
  it('takes the trusted right-most entry, ignoring spoofed left entries', () => {
    expect(clientIpFromHeaders(H({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 203.0.113.5' }))).toBe('203.0.113.5');
  });
  it('honors TRUSTED_PROXY_HOPS=2', () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    expect(clientIpFromHeaders(H({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 9.9.9.9' }))).toBe('2.2.2.2');
  });
  it('falls back to x-real-ip then localhost', () => {
    expect(clientIpFromHeaders(H({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8');
    expect(clientIpFromHeaders(H({}))).toBe('127.0.0.1');
  });
});

describe('hashIp', () => {
  it('is deterministic, 64-hex, and salt-dependent', () => {
    process.env.IP_SALT = 'salt-a';
    const a = hashIp('203.0.113.5');
    expect(a).toBe(hashIp('203.0.113.5'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    process.env.IP_SALT = 'salt-b';
    expect(hashIp('203.0.113.5')).not.toBe(a);
  });
});

describe('parseUa / isBot', () => {
  it('detects desktop browser + os', () => {
    const r = parseUa('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');
    expect(r.deviceType).toBe('desktop');
    expect(r.browser).toBe('Chrome');
    expect(r.os).toBe('macOS');
  });
  it('flags crawlers as bots', () => {
    expect(isBot('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true);
    expect(parseUa('Googlebot/2.1').deviceType).toBe('bot');
    expect(isBot('Mozilla/5.0 Chrome/120')).toBe(false);
  });
});
