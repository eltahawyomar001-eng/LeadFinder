import { NextRequest, NextResponse } from 'next/server';
import { searchOverpass } from '@/lib/overpass';
import { scrapeEmailFromWebsite } from '@/lib/scrapeEmail';
import { GERMAN_CITIES } from '@/lib/cities';
import { GERMAN_STATES } from '@/lib/states';
import type { SearchResponse } from '@/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { category, city, stateName, radius = 5 } = await req.json() as {
      category: string;
      city?: string;
      stateName?: string;
      radius?: number;
    };

    if (!category) {
      return NextResponse.json({ error: 'category is required' }, { status: 400 });
    }

    let lat = 0, lng = 0, radiusM = 0;

    if (stateName) {
      const stateData = GERMAN_STATES.find((s) => s.osmName === stateName);
      if (!stateData) {
        return NextResponse.json({ error: `Unknown state: ${stateName}` }, { status: 400 });
      }
      lat = stateData.lat;
      lng = stateData.lng;
      // radiusM not used for state queries
    } else if (city) {
      const cityData = GERMAN_CITIES.find((c) => c.name === city);
      if (!cityData) {
        return NextResponse.json({ error: 'Unknown city' }, { status: 400 });
      }
      lat = cityData.lat;
      lng = cityData.lng;
      radiusM = radius * 1000;
    } else {
      return NextResponse.json({ error: 'city or stateName required' }, { status: 400 });
    }

    const leads = await searchOverpass(category, lat, lng, radiusM, stateName);

    // For state-level queries skip email scraping — too many results, not enough time.
    // For city-level queries scrape emails in parallel.
    if (!stateName) {
      const emails = await Promise.all(
        leads.map((l) => l.website ? scrapeEmailFromWebsite(l.website) : Promise.resolve(null))
      );
      leads.forEach((l, i) => { l.email = emails[i]; });
    }

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
