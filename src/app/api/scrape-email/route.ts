import { NextRequest, NextResponse } from 'next/server';
import { analyzeWebsite } from '@/lib/scrapeEmail';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const { website } = await req.json() as { website: string };
    if (!website) return NextResponse.json({ email: null });
    const analysis = await analyzeWebsite(website);
    return NextResponse.json({
      email: analysis.email,
      phone: analysis.phone,
      builder: analysis.builder,
      isModern: analysis.isModern,
      language: analysis.language,
    });
  } catch {
    return NextResponse.json({ email: null });
  }
}
