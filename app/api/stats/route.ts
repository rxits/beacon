import { NextResponse, type NextRequest } from 'next/server';
import { getStats, type Range } from '@/lib/queries';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const range = (req.nextUrl.searchParams.get('range') ?? '7d') as Range;
  return NextResponse.json(await getStats(['24h', '7d', '30d'].includes(range) ? range : '7d'));
}
