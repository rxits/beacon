import { chromium } from 'playwright-core';
const url = process.argv[2] ?? 'http://localhost:3000/dashboard';
const out = process.argv[3] ?? 'dash.png';
const theme = (process.argv[4] ?? 'dark') as 'dark' | 'light';
const full = process.argv[5] === 'full';
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: theme });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await p.fill('input[name=email]', 'demo@beacon.local');
  await p.fill('input[name=password]', 'demo1234');
  await Promise.all([p.waitForURL('**/dashboard', { timeout: 20000 }).catch(() => {}), p.click('button[type=submit]')]);
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2800);
  await p.screenshot({ path: out, fullPage: full });
  await b.close();
  console.log('shot ->', out);
})().catch((e) => { console.error(e); process.exit(1); });
