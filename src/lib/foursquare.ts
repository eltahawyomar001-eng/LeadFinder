import type { Lead } from '@/types';
import { formatPhoneForWhatsApp, generateWhatsAppMessage, generateEmailPitch, isMobileNumber } from './whatsapp';
import { scoreWeakness } from './scoring';

interface FoursquarePlace {
  fsq_id: string;
  name: string;
  location?: { formatted_address?: string };
  tel?: string;
  website?: string;
  rating?: number; // 0–10 scale
  hours?: { open_now?: boolean };
}

interface FoursquareResponse {
  results: FoursquarePlace[];
}

export async function searchFoursquare(
  categoryQuery: string,
  lat: number,
  lng: number,
  radiusM: number
): Promise<Lead[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      ll: `${lat},${lng}`,
      query: categoryQuery,
      radius: String(Math.min(radiusM, 100_000)),
      limit: '50',
      fields: 'fsq_id,name,location,tel,website,rating,hours',
    });

    const res = await fetch(
      `https://api.foursquare.com/v3/places/search?${params.toString()}`,
      {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(12_000),
      }
    );

    if (!res.ok) return [];

    const data: FoursquareResponse = await res.json();
    const leads: Lead[] = [];

    for (const place of data.results ?? []) {
      const name = place.name;
      if (!name) continue;

      const phone = place.tel ?? null;
      const website = place.website ?? null;
      const address = place.location?.formatted_address ?? 'Adresse nicht verfügbar';
      // Foursquare rating is 0–10; convert to 0–5 for consistency
      const rating = place.rating != null ? place.rating / 2 : null;

      const { score, reasons } = scoreWeakness(website, rating, null);
      const whatsapp_link = phone ? formatPhoneForWhatsApp(phone) : null;
      const whatsapp_message = generateWhatsAppMessage(name, reasons);
      const emailPitch = generateEmailPitch(name, reasons);

      leads.push({
        place_id: `fsq_${place.fsq_id}`,
        name,
        phone,
        whatsapp_link,
        formatted_address: address,
        website,
        rating,
        user_ratings_total: null,
        business_status: place.hours?.open_now === false ? 'CLOSED_TEMPORARILY' : 'OPERATIONAL',
        types: [categoryQuery],
        weakness_score: score,
        weakness_reasons: reasons,
        whatsapp_message,
        is_mobile: phone ? isMobileNumber(phone) : false,
        email: null,
        email_subject: emailPitch.subject,
        email_body: emailPitch.body,
      });
    }

    leads.sort((a, b) => b.weakness_score - a.weakness_score);
    return leads;
  } catch {
    return [];
  }
}
