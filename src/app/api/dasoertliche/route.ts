import { NextRequest, NextResponse } from 'next/server';
import { searchDasOertliche } from '@/lib/dasoertliche';
import { GERMAN_CITIES } from '@/lib/cities';
import type { SearchResponse } from '@/types';

export const maxDuration = 20;

export async function POST(req: NextRequest) {
  try {
    const { category, city } = await req.json() as {
      category: string;
      city: string;
      radius?: number;
    };

    if (!category || !city) {
      return NextResponse.json({ error: 'category and city are required' }, { status: 400 });
    }

    // Validate that city is known (even though scraper uses name, not coords)
    const cityData = GERMAN_CITIES.find((c) => c.name === city);
    if (!cityData) {
      return NextResponse.json({ error: 'Unknown city' }, { status: 400 });
    }

    const leads = await searchDasOertliche(category, city);

    const response: SearchResponse = {
      leads,
      total: leads.length,
      withPhone: leads.filter((l) => l.phone !== null).length,
      highPriority: leads.filter((l) => l.weakness_score >= 6).length,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Das Örtliche search error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
