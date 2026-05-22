import { NextRequest, NextResponse } from 'next/server';
import { scrapeEmailFromWebsite } from '@/lib/scrapeEmail';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const { website } = await req.json() as { website: string };
    if (!website) return NextResponse.json({ email: null });
    const email = await scrapeEmailFromWebsite(website);
    return NextResponse.json({ email });
  } catch {
    return NextResponse.json({ email: null });
  }
}
