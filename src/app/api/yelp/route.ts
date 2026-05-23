import { NextRequest, NextResponse } from 'next/server';
import { searchYelp } from '@/lib/yelp';
import { analyzeWebsite } from '@/lib/scrapeEmail';
import { enrichLeadWithAnalysis } from '@/lib/enrich';
import { findCity } from '@/lib/locations';
import { COUNTRY_INFO } from '@/types';
import type { SearchResponse, Country, PitchLang } from '@/types';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { category, city, radius = 5, country = 'de' } = await req.json() as {
      category: string;
      city: string;
      radius?: number;
      country?: Country;
    };

    if (!category || !city) {
      return NextResponse.json({ error: 'category and city are required' }, { status: 400 });
    }

    const countryLang: PitchLang = COUNTRY_INFO[country]?.defaultLang ?? 'de';
    const cityData = findCity(city, country) ?? findCity(city);
    if (!cityData) {
      return NextResponse.json({ error: 'Unknown city' }, { status: 400 });
    }

    const radiusM = radius * 1000;
    const leads = await searchYelp(category, cityData.lat, cityData.lng, radiusM);

    const withWebsite = leads.filter((l) => l.website).slice(0, 20);
    if (withWebsite.length > 0) {
      const analyses = await Promise.all(withWebsite.map((l) => analyzeWebsite(l.website!)));
      withWebsite.forEach((l, i) => enrichLeadWithAnalysis(l, analyses[i], countryLang, country));
      leads.sort((a, b) => b.weakness_score - a.weakness_score);
    }

    const response: SearchResponse = {
      leads,
      total: leads.length,
      withPhone: leads.filter((l) => l.phone !== null).length,
      highPriority: leads.filter((l) => l.weakness_score >= 6).length,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Yelp search error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
