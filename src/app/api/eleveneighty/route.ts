import { NextRequest, NextResponse } from 'next/server';
import { searchElevenEighty } from '@/lib/eleveneighty';
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

    const cityData = GERMAN_CITIES.find((c) => c.name === city);
    if (!cityData) {
      return NextResponse.json({ error: 'Unknown city' }, { status: 400 });
    }

    const leads = await searchElevenEighty(category, city);

    const response: SearchResponse = {
      leads,
      total: leads.length,
      withPhone: leads.filter((l) => l.phone !== null).length,
      highPriority: leads.filter((l) => l.weakness_score >= 6).length,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : '11880 search error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
