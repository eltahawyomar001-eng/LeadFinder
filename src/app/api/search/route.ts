import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces, buildLeads } from '@/lib/googlePlaces';
import { GERMAN_CITIES } from '@/lib/cities';
import type { SearchResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, city, radius = 5, pageToken } = body as {
      category: string;
      city: string;
      radius: number;
      pageToken?: string;
    };

    if (!category || !city) {
      return NextResponse.json({ error: 'category and city are required' }, { status: 400 });
    }

    const cityData = GERMAN_CITIES.find((c) => c.name === city);
    if (!cityData) {
      return NextResponse.json({ error: 'Unknown city' }, { status: 400 });
    }

    const query = `${category} in ${city}`;
    const radiusMeters = radius * 1000;

    const { results, nextPageToken } = await searchPlaces(
      query,
      cityData.lat,
      cityData.lng,
      radiusMeters,
      pageToken
    );

    const leads = await buildLeads(results);
    leads.sort((a, b) => b.weakness_score - a.weakness_score);

    const response: SearchResponse = {
      leads,
      nextPageToken,
      total: leads.length,
      withPhone: leads.filter((l) => l.phone !== null).length,
      highPriority: leads.filter((l) => l.weakness_score >= 6).length,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
