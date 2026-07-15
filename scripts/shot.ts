import { chromium } from 'playwright-core';
const exe = process.env.PW_CHROME!;
const url = process.argv[2] ?? 'http://localhost:3000/login';
const out = process.argv[3] ?? 'shot.png';
const theme = process.argv[4] ?? 'dark';
(async () => {
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: theme as 'dark' | 'light' });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.screenshot({ path: out });
  await b.close();
  console.log('shot ->', out);
})().catch((e) => { console.error(e); process.exit(1); });
