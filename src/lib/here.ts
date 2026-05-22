import type { Lead } from '@/types';
import { formatPhoneForWhatsApp, generateWhatsAppMessage, generateEmailPitch, isMobileNumber } from './whatsapp';
import { scoreWeakness } from './scoring';

interface HereItem {
  id: string;
  title: string;
  address?: { label?: string };
  contacts?: Array<{
    phone?: Array<{ value: string }>;
    www?: Array<{ value: string }>;
    email?: Array<{ value: string }>;
  }>;
}

interface HereResponse {
  items: HereItem[];
}

export async function searchHere(
  categoryQuery: string,
  lat: number,
  lng: number,
  radiusM: number
): Promise<Lead[]> {
  const apiKey = process.env.HERE_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      at: `${lat},${lng}`,
      q: categoryQuery,
      limit: '100',
      in: `circle:${lat},${lng};r=${radiusM}`,
      lang: 'de',
      apiKey,
    });

    const res = await fetch(
      `https://discover.search.hereapi.com/v1/discover?${params.toString()}`,
      { signal: AbortSignal.timeout(12_000) }
    );

    if (!res.ok) return [];

    const data: HereResponse = await res.json();
    const leads: Lead[] = [];

    for (const item of data.items ?? []) {
      const name = item.title;
      if (!name) continue;

      const contact = item.contacts?.[0];
      const phone = contact?.phone?.[0]?.value ?? null;
      const website = contact?.www?.[0]?.value ?? null;
      const email = contact?.email?.[0]?.value ?? null;
      const address = item.address?.label ?? 'Adresse nicht verfügbar';

      const { score, reasons } = scoreWeakness(website, null, null);
      const whatsapp_link = phone ? formatPhoneForWhatsApp(phone) : null;
      const whatsapp_message = generateWhatsAppMessage(name, reasons);
      const emailPitch = generateEmailPitch(name, reasons);

      leads.push({
        place_id: `here_${item.id}`,
        name,
        phone,
        whatsapp_link,
        formatted_address: address,
        website,
        rating: null,
        user_ratings_total: null,
        business_status: 'OPERATIONAL',
        types: [categoryQuery],
        weakness_score: score,
        weakness_reasons: reasons,
        whatsapp_message,
        is_mobile: phone ? isMobileNumber(phone) : false,
        email,
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
