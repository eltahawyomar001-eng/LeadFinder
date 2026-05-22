import { NextRequest, NextResponse } from 'next/server';
import { searchOverpass } from '@/lib/overpass';
import { scrapeEmailFromWebsite } from '@/lib/scrapeEmail';
import { GERMAN_CITIES } from '@/lib/cities';
import type { SearchResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { category, city, radius = 5 } = await req.json() as {
      category: string;
      city: string;
      radius: number;
    };

    if (!category || !city) {
      return NextResponse.json({ error: 'category and city are required' }, { status: 400 });
    }

    const cityData = GERMAN_CITIES.find((c) => c.name === city);
    if (!cityData) {
      return NextResponse.json({ error: 'Unknown city' }, { status: 400 });
    }

    const leads = await searchOverpass(category, cityData.lat, cityData.lng, radius * 1000);

    // Scrape emails in parallel for leads that have a website
    const emails = await Promise.all(
      leads.map((l) => l.website ? scrapeEmailFromWebsite(l.website) : Promise.resolve(null))
    );
    leads.forEach((l, i) => { l.email = emails[i]; });

    const response: SearchResponse = {
      leads,
      total: leads.length,
      withPhone: leads.filter((l) => l.phone !== null).length,
      highPriority: leads.filter((l) => l.weakness_score >= 6).length,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Overpass error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
