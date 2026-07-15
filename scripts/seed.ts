import 'dotenv/config';
import { db } from '../db';
import { users, events, type NewEvent } from '../db/schema';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';

const SALT = process.env.IP_SALT ?? 'beacon-dev-salt';
const ipHash = (ip: string) => createHash('sha256').update(ip + SALT).digest('hex');
const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
function gaussian() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const CITIES = [
  { city: 'San Francisco', region: 'California', country: 'United States', cc: 'US', lat: 37.77, lng: -122.42 },
  { city: 'New York', region: 'New York', country: 'United States', cc: 'US', lat: 40.71, lng: -74.01 },
  { city: 'London', region: 'England', country: 'United Kingdom', cc: 'GB', lat: 51.51, lng: -0.13 },
  { city: 'Berlin', region: 'Berlin', country: 'Germany', cc: 'DE', lat: 52.52, lng: 13.40 },
  { city: 'Bengaluru', region: 'Karnataka', country: 'India', cc: 'IN', lat: 12.97, lng: 77.59 },
  { city: 'Mumbai', region: 'Maharashtra', country: 'India', cc: 'IN', lat: 19.08, lng: 72.88 },
  { city: 'Toronto', region: 'Ontario', country: 'Canada', cc: 'CA', lat: 43.65, lng: -79.38 },
  { city: 'Sydney', region: 'New South Wales', country: 'Australia', cc: 'AU', lat: -33.87, lng: 151.21 },
  { city: 'Tokyo', region: 'Tokyo', country: 'Japan', cc: 'JP', lat: 35.68, lng: 139.69 },
  { city: 'Singapore', region: 'Singapore', country: 'Singapore', cc: 'SG', lat: 1.35, lng: 103.82 },
  { city: 'Paris', region: 'Ile-de-France', country: 'France', cc: 'FR', lat: 48.86, lng: 2.35 },
  { city: 'Sao Paulo', region: 'Sao Paulo', country: 'Brazil', cc: 'BR', lat: -23.55, lng: -46.63 },
  { city: 'Amsterdam', region: 'North Holland', country: 'Netherlands', cc: 'NL', lat: 52.37, lng: 4.90 },
  { city: 'Dubai', region: 'Dubai', country: 'United Arab Emirates', cc: 'AE', lat: 25.20, lng: 55.27 },
  { city: 'Lagos', region: 'Lagos', country: 'Nigeria', cc: 'NG', lat: 6.52, lng: 3.38 },
];
const DEVICES = [
  { browser: 'Chrome', os: 'macOS', deviceType: 'desktop' as const },
  { browser: 'Chrome', os: 'Windows', deviceType: 'desktop' as const },
  { browser: 'Safari', os: 'macOS', deviceType: 'desktop' as const },
  { browser: 'Firefox', os: 'Linux', deviceType: 'desktop' as const },
  { browser: 'Edge', os: 'Windows', deviceType: 'desktop' as const },
  { browser: 'Safari', os: 'iOS', deviceType: 'mobile' as const },
  { browser: 'Chrome', os: 'Android', deviceType: 'mobile' as const },
  { browser: 'Safari', os: 'iPadOS', deviceType: 'tablet' as const },
];
const PATHS = ['/', '/login', '/dashboard', '/dashboard/activity', '/dashboard/users', '/dashboard/map', '/pricing', '/blog/launch'];
const REFERRERS = ['', 'https://www.google.com', 'https://www.linkedin.com', 'https://github.com', 'https://twitter.com', 'https://news.ycombinator.com', 'https://www.reddit.com'];
const EVENT_TYPES: Array<{ t: 'page_view' | 'login' | 'signup' | 'click'; w: number }> = [
  { t: 'page_view', w: 70 }, { t: 'click', w: 20 }, { t: 'login', w: 7 }, { t: 'signup', w: 3 },
];
const weightedEvent = () => { const total = EVENT_TYPES.reduce((s, e) => s + e.w, 0); let r = Math.random() * total; for (const e of EVENT_TYPES) { if ((r -= e.w) < 0) return e.t; } return 'page_view' as const; };
const FIRST = ['Aria','Noah','Maya','Liam','Zoe','Kai','Elena','Omar','Priya','Lucas','Sofia','Ethan','Nina','Diego','Yuki','Ava','Marco','Leila','Ivan','Chloe'];
const LAST = ['Chen','Patel','Kim','Silva','Muller','Okafor','Rossi','Nguyen','Haddad','Novak','Santos','Yamamoto','Ivanova','Dubois','Costa','Ali','Weber','Torres','Singh','Larsen'];
const randomIp = () => `${randInt(1,223)}.${randInt(0,255)}.${randInt(0,255)}.${randInt(1,254)}`;

async function main() {
  console.log('Resetting…');
  await db.delete(events);
  await db.delete(users);

  console.log('Seeding 20 users…');
  const pw = await bcrypt.hash('demo1234', 10);
  const now = Date.now();
  const userRows = Array.from({ length: 20 }, (_, i) => {
    const name = i === 0 ? 'Demo User' : `${FIRST[i]} ${LAST[i]}`;
    const email = i === 0 ? 'demo@beacon.local' : `${FIRST[i].toLowerCase()}.${LAST[i].toLowerCase()}@beacon.demo`;
    return { name, email, passwordHash: pw, createdAt: new Date(now - randInt(1, 60) * 864e5) };
  });
  const inserted = await db.insert(users).values(userRows).returning({ id: users.id });
  const userIds = inserted.map((u) => u.id);

  console.log('Seeding events…');
  const rows: NewEvent[] = [];
  for (let i = 0; i < 1000; i++) {
    const c = rand(CITIES), d = rand(DEVICES);
    const signedIn = Math.random() < 0.65;
    const ip = randomIp();
    const daysAgo = Math.floor(Math.abs(gaussian()) * 10) % 30;
    const hour = Math.max(0, Math.min(23, Math.round(9 + gaussian() * 4)));
    const ts = new Date(now - daysAgo * 864e5);
    ts.setHours(hour, randInt(0, 59), randInt(0, 59), 0);
    rows.push({
      sessionId: `sess_${randInt(100000, 999999)}`,
      userId: signedIn ? rand(userIds) : null,
      ip, ipHash: ipHash(ip),
      country: c.country, countryCode: c.cc, region: c.region, city: c.city,
      latitude: c.lat, longitude: c.lng,
      browser: d.browser, os: d.os, deviceType: d.deviceType,
      path: rand(PATHS), referrer: rand(REFERRERS) || null,
      eventType: weightedEvent(), createdAt: ts,
    });
  }
  for (let i = 0; i < rows.length; i += 500) await db.insert(events).values(rows.slice(i, i + 500));
  console.log(`Seeded ${userRows.length} users and ${rows.length} events.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
