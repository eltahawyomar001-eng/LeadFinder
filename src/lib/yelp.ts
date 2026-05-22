import type { Lead } from '@/types';
import { formatPhoneForWhatsApp, generateWhatsAppMessage, generateEmailPitch, isMobileNumber } from './whatsapp';
import { scoreWeakness } from './scoring';

interface YelpBusiness {
  id: string;
  name: string;
  phone?: string;
  rating?: number;
  review_count?: number;
  is_closed?: boolean;
  location?: {
    address1?: string;
    zip_code?: string;
    city?: string;
  };
}

interface YelpResponse {
  businesses: YelpBusiness[];
}

export async function searchYelp(
  categoryQuery: string,
  lat: number,
  lng: number,
  radiusM: number
): Promise<Lead[]> {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      term: categoryQuery,
      radius: String(Math.min(radiusM, 40_000)),
      limit: '50',
      locale: 'de_DE',
    });

    const res = await fetch(
      `https://api.yelp.com/v3/businesses/search?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(12_000),
      }
    );

    if (!res.ok) return [];

    const data: YelpResponse = await res.json();
    const leads: Lead[] = [];

    for (const biz of data.businesses ?? []) {
      const name = biz.name;
      if (!name) continue;

      const phone = biz.phone || null;
      // Yelp doesn't return website in search results
      const website: string | null = null;
      const loc = biz.location;
      const addressParts = [loc?.address1, loc?.zip_code, loc?.city].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(', ') : 'Adresse nicht verfügbar';
      const rating = biz.rating ?? null;
      const totalRatings = biz.review_count ?? null;

      const { score, reasons } = scoreWeakness(website, rating, totalRatings);
      const whatsapp_link = phone ? formatPhoneForWhatsApp(phone) : null;
      const whatsapp_message = generateWhatsAppMessage(name, reasons);
      const emailPitch = generateEmailPitch(name, reasons);

      leads.push({
        place_id: `yelp_${biz.id}`,
        name,
        phone,
        whatsapp_link,
        formatted_address: address,
        website,
        rating,
        user_ratings_total: totalRatings,
        business_status: biz.is_closed ? 'CLOSED_PERMANENTLY' : 'OPERATIONAL',
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
