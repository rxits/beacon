import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { listEvents } from '@/lib/queries';

export const runtime = 'nodejs';

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  identity: z.enum(['user', 'anonymous']).optional(),
  country: z.string().regex(/^[A-Za-z]{2}$/).optional(),
  device: z.enum(['desktop', 'mobile', 'tablet', 'bot', 'unknown']).optional(),
  type: z.enum(['page_view', 'login', 'signup', 'click']).optional(),
  search: z.string().max(120).optional(),
  since: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: { code: 'invalid_query', message: 'Invalid query parameters' } }, { status: 400 });
  const q = parsed.data;
  const res = await listEvents({
    limit: q.limit, offset: q.offset,
    signedIn: q.identity === 'user' ? true : q.identity === 'anonymous' ? false : undefined,
    country: q.country?.toUpperCase(), device: q.device, eventType: q.type,
    search: q.search, since: q.since,
  });
  return NextResponse.json(res);
}
