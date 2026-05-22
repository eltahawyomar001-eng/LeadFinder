import { NextRequest, NextResponse } from 'next/server';
import { searchHere } from '@/lib/here';
import { scrapeEmailFromWebsite } from '@/lib/scrapeEmail';
import { GERMAN_CITIES } from '@/lib/cities';
import type { SearchResponse } from '@/types';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { category, city, radius = 5 } = await req.json() as {
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

    const radiusM = radius * 1000;
    const leads = await searchHere(category, cityData.lat, cityData.lng, radiusM);

    // Scrape emails for top 20 leads with websites
    const withWebsite = leads.filter((l) => l.website).slice(0, 20);
    const emails = await Promise.all(withWebsite.map((l) => scrapeEmailFromWebsite(l.website!)));
    withWebsite.forEach((l, i) => { l.email = emails[i]; });

    const response: SearchResponse = {
      leads,
      total: leads.length,
      withPhone: leads.filter((l) => l.phone !== null).length,
      highPriority: leads.filter((l) => l.weakness_score >= 6).length,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'HERE search error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
