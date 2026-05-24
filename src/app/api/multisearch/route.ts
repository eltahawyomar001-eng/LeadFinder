import { NextRequest, NextResponse } from 'next/server';
import { searchOverpass } from '@/lib/overpass';
import { searchHere } from '@/lib/here';
import { searchYelp } from '@/lib/yelp';
import { searchFoursquare } from '@/lib/foursquare';
import { searchDasOertliche } from '@/lib/dasoertliche';
import { searchGelbeSeiten } from '@/lib/gelbeseiten';
import { searchElevenEighty } from '@/lib/eleveneighty';
import { analyzeWebsite } from '@/lib/scrapeEmail';
import { enrichLeadWithAnalysis } from '@/lib/enrich';
import { findCity } from '@/lib/locations';
import { COUNTRY_INFO } from '@/types';
import type { Lead, SearchResponse, Country, PitchLang } from '@/types';

export const maxDuration = 60;

/** Normalize a business name for deduplication */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c] ?? c))
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

/** Count how many contact fields are populated */
function contactScore(lead: Lead): number {
  return (lead.phone ? 2 : 0) + (lead.website ? 1 : 0) + (lead.email ? 1 : 0);
}

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

    const { lat, lng } = cityData;
    const radiusM = radius * 1000;

    // Run all sources in parallel — German-only scrapers only when country is 'de'
    const promises: Promise<Lead[]>[] = [
      searchOverpass(category, lat, lng, radiusM, undefined, countryLang),
      searchHere(category, lat, lng, radiusM),
      searchYelp(category, lat, lng, radiusM),
      searchFoursquare(category, lat, lng, radiusM),
    ];
    if (country === 'de') {
      promises.push(
        searchDasOertliche(category, city),
        searchGelbeSeiten(category, city),
        searchElevenEighty(category, city),
      );
    }
    const results = await Promise.allSettled(promises);

    // Flatten all successful results
    let allLeads: Lead[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allLeads.push(...result.value);
      }
    }

    // Adaptive radius: if Overpass returned very few results (<5), retry with 2× radius
    // This helps sparse international markets where OSM coverage is lower
    const overpassCount = results[0].status === 'fulfilled' ? results[0].value.length : 0;
    if (overpassCount < 5 && radiusM < 20_000) {
      try {
        const wider = await searchOverpass(category, lat, lng, radiusM * 2, undefined, countryLang);
        allLeads.push(...wider);
      } catch { /* non-fatal */ }
    }

    // Deduplicate by normalized name — keep entry with most contact info
    const dedupMap = new Map<string, Lead>();
    for (const lead of allLeads) {
      const key = normalizeName(lead.name);
      const existing = dedupMap.get(key);
      if (!existing || contactScore(lead) > contactScore(existing)) {
        dedupMap.set(key, lead);
      }
    }

    const deduped = [...dedupMap.values()];

    // Analyze websites for top 30 (quality scoring + email + language)
    const withWebsite = deduped.filter((l) => l.website && !l.email).slice(0, 30);
    const analyses = await Promise.all(withWebsite.map((l) => analyzeWebsite(l.website!)));
    withWebsite.forEach((l, i) => enrichLeadWithAnalysis(l, analyses[i], countryLang, country));

    // Sort by weakness score descending
    deduped.sort((a, b) => b.weakness_score - a.weakness_score);

    const response: SearchResponse = {
      leads: deduped,
      total: deduped.length,
      withPhone: deduped.filter((l) => l.phone !== null).length,
      highPriority: deduped.filter((l) => l.weakness_score >= 6).length,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Multi-search error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
