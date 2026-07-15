import { UAParser } from 'ua-parser-js';

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
export type DeviceInfo = { browser: string | null; os: string | null; deviceType: DeviceType };

const BOT = /bot|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|headless|lighthouse|monitor/i;

export function isBot(ua: string | null): boolean {
  return !!ua && BOT.test(ua);
}

export function parseUa(ua: string | null): DeviceInfo {
  if (!ua) return { browser: null, os: null, deviceType: 'unknown' };
  const r = new UAParser(ua).getResult();
  let deviceType: DeviceType = 'desktop';
  if (r.device.type === 'mobile') deviceType = 'mobile';
  else if (r.device.type === 'tablet') deviceType = 'tablet';
  else if (isBot(ua)) deviceType = 'bot';
  return { browser: r.browser.name ?? null, os: r.os.name ?? null, deviceType };
}
