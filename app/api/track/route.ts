import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { recordEvent } from '@/lib/track';
import { rateLimit } from '@/lib/ratelimit';
import { isBot } from '@/lib/ua';
import { clientIpFromHeaders } from '@/lib/ip';
import { auth } from '@/auth';

export const runtime = 'nodejs';

const Body = z.object({
  path: z.string().min(1).max(2048),
  referrer: z.string().max(2048).nullish(),
  eventType: z.enum(['page_view', 'login', 'signup', 'click']).optional(),
  sessionId: z.string().max(128).nullish(),
});

export async function POST(req: NextRequest) {
  if (isBot(req.headers.get('user-agent'))) {
    return NextResponse.json({ ok: true, filtered: true }, { status: 202 });
  }
  const ip = clientIpFromHeaders(req.headers);
  if (!rateLimit(`track:${ip}`)) {
    return NextResponse.json({ error: { code: 'rate_limited', message: 'Too many requests' } }, { status: 429 });
  }
  let json: unknown;
  try { json = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'bad_json', message: 'Invalid JSON' } }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'invalid', message: 'Invalid body' } }, { status: 400 });
  }
  const session = await auth();
  await recordEvent(req.headers, { ...parsed.data, userId: session?.user?.id ?? null });
  return NextResponse.json({ ok: true }, { status: 202 });
}
