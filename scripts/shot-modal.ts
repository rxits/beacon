import { chromium } from 'playwright-core';
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await p.fill('input[name=email]', 'demo@beacon.local');
  await p.fill('input[name=password]', 'demo1234');
  await Promise.all([p.waitForURL('**/dashboard', { timeout: 20000 }).catch(() => {}), p.click('button[type=submit]')]);
  await p.goto('http://localhost:3000/dashboard/activity', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1600);
  await p.click('tbody tr:first-child');
  await p.waitForTimeout(700);
  await p.screenshot({ path: process.argv[2] });
  await b.close();
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
