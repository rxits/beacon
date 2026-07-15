import { NextResponse, type NextRequest } from 'next/server';
import { listEvents } from '@/lib/queries';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const identity = sp.get('identity');
  const res = await listEvents({
    limit: Number(sp.get('limit') ?? '25'),
    offset: Number(sp.get('offset') ?? '0'),
    signedIn: identity === 'user' ? true : identity === 'anonymous' ? false : undefined,
    country: sp.get('country') ?? undefined,
    device: sp.get('device') ?? undefined,
    eventType: sp.get('type') ?? undefined,
    search: sp.get('search') ?? undefined,
    since: sp.get('since') ?? undefined,
  });
  return NextResponse.json(res);
}
