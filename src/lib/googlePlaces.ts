import type { Lead } from '@/types';
import { formatPhoneForWhatsApp, generateWhatsAppMessage, generateEmailPitch, isMobileNumber } from './whatsapp';
import { scoreWeakness } from './scoring';
import { scrapeEmailFromWebsite } from './scrapeEmail';

const BASE = 'https://maps.googleapis.com/maps/api/place';
const KEY = process.env.GOOGLE_PLACES_API_KEY!;

interface PlacesSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  types?: string[];
  geometry: { location: { lat: number; lng: number } };
}

interface PlacesTextSearchResponse {
  results: PlacesSearchResult[];
  next_page_token?: string;
  status: string;
}

interface PlaceDetailsResponse {
  result: {
    formatted_phone_number?: string;
    website?: string;
  };
  status: string;
}

export async function searchPlaces(
  query: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  pageToken?: string
): Promise<{ results: PlacesSearchResult[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    query,
    language: 'de',
    region: 'de',
    key: KEY,
  });

  if (pageToken) {
    params.set('pagetoken', pageToken);
  } else {
    params.set('location', `${lat},${lng}`);
    params.set('radius', String(radiusMeters));
  }

  const res = await fetch(`${BASE}/textsearch/json?${params}`);
  const data: PlacesTextSearchResponse = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places error: ${data.status}`);
  }

  return {
    results: data.results,
    nextPageToken: data.next_page_token,
  };
}

export async function fetchPlaceDetails(
  placeId: string
): Promise<{ phone: string | null; website: string | null }> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'formatted_phone_number,website',
    language: 'de',
    key: KEY,
  });

  const res = await fetch(`${BASE}/details/json?${params}`);
  const data: PlaceDetailsResponse = await res.json();

  if (data.status !== 'OK') {
    return { phone: null, website: null };
  }

  return {
    phone: data.result.formatted_phone_number ?? null,
    website: data.result.website ?? null,
  };
}

export async function buildLeads(
  results: PlacesSearchResult[]
): Promise<Lead[]> {
  const details = await Promise.all(
    results.map((r) => fetchPlaceDetails(r.place_id))
  );

  // Scrape emails in parallel only for leads that have a website
  const emails = await Promise.all(
    details.map((d) => d.website ? scrapeEmailFromWebsite(d.website) : Promise.resolve(null))
  );

  return results.map((r, i) => {
    const { phone, website } = details[i];
    const email = emails[i];
    const { score, reasons } = scoreWeakness(
      website,
      r.rating ?? null,
      r.user_ratings_total ?? null
    );
    const whatsapp_link = phone ? formatPhoneForWhatsApp(phone) : null;
    const whatsapp_message = generateWhatsAppMessage(r.name, reasons);
    const emailPitch = generateEmailPitch(r.name, reasons);

    return {
      place_id: r.place_id,
      name: r.name,
      phone: phone ?? null,
      whatsapp_link,
      formatted_address: r.formatted_address,
      website: website ?? null,
      rating: r.rating ?? null,
      user_ratings_total: r.user_ratings_total ?? null,
      business_status: r.business_status ?? 'UNKNOWN',
      types: r.types ?? [],
      weakness_score: score,
      weakness_reasons: reasons,
      whatsapp_message,
      is_mobile: phone ? isMobileNumber(phone) : false,
      email: email ?? null,
      email_subject: emailPitch.subject,
      email_body: emailPitch.body,
    };
  });
}
