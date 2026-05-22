import type { Lead } from '@/types';
import { formatPhoneForWhatsApp, generateWhatsAppMessage, generateEmailPitch, isMobileNumber } from './whatsapp';
import { scoreWeakness } from './scoring';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface JsonLdEntry {
  '@type'?: string | string[];
  name?: string;
  telephone?: string;
  url?: string;
  address?: {
    streetAddress?: string;
    postalCode?: string;
    addressLocality?: string;
  } | string;
}

function isLocalBusiness(entry: JsonLdEntry): boolean {
  const type = entry['@type'];
  if (!type) return false;
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) =>
    /LocalBusiness|Organization|Store|Restaurant|MedicalOrganization|Professional/i.test(t)
  );
}

function formatAddressFromJsonLd(address: JsonLdEntry['address']): string {
  if (!address) return 'Adresse nicht verfügbar';
  if (typeof address === 'string') return address;
  const parts = [address.streetAddress, address.postalCode, address.addressLocality].filter(Boolean);
  return parts.join(', ') || 'Adresse nicht verfügbar';
}

function extractJsonLdBlocks(html: string): JsonLdEntry[] {
  const entries: JsonLdEntry[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        entries.push(...parsed);
      } else {
        entries.push(parsed);
      }
    } catch {
      // skip malformed JSON-LD
    }
  }
  return entries;
}

function extractGermanPhones(html: string): string[] {
  const re = /(\+49[\d\s\-\/]{6,20}|0[\d]{2,5}[\s\-\/]?[\d\s\-\/]{3,12})/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const phone = m[1].trim();
    if (phone.replace(/\D/g, '').length >= 7) found.add(phone);
  }
  return [...found];
}

export async function searchDasOertliche(
  categoryQuery: string,
  cityName: string
): Promise<Lead[]> {
  try {
    const url = `https://www.dasoertliche.de/Controller?form_name=search_nat&kw=${encodeURIComponent(categoryQuery)}&ci=${encodeURIComponent(cityName)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return [];
    const html = await res.text();

    const entries = extractJsonLdBlocks(html);
    const leads: Lead[] = [];
    const seen = new Set<string>();

    for (const entry of entries) {
      if (!isLocalBusiness(entry)) continue;
      const name = entry.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);

      const phone = entry.telephone ?? null;
      const website = entry.url ?? null;
      const address = formatAddressFromJsonLd(entry.address);

      const { score, reasons } = scoreWeakness(website, null, null);
      const whatsapp_link = phone ? formatPhoneForWhatsApp(phone) : null;
      const whatsapp_message = generateWhatsAppMessage(name, reasons);
      const emailPitch = generateEmailPitch(name, reasons);

      leads.push({
        place_id: `daso_${Buffer.from(name + address).toString('base64').slice(0, 20)}`,
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
        email: null,
        email_subject: emailPitch.subject,
        email_body: emailPitch.body,
      });
    }

    // If JSON-LD yielded nothing, try regex-extracted phones as a fallback
    if (leads.length === 0) {
      const phones = extractGermanPhones(html).slice(0, 20);
      for (const phone of phones) {
        const name = `${categoryQuery} (${cityName})`;
        const { score, reasons } = scoreWeakness(null, null, null);
        const whatsapp_link = formatPhoneForWhatsApp(phone);
        const whatsapp_message = generateWhatsAppMessage(name, reasons);
        const emailPitch = generateEmailPitch(name, reasons);
        leads.push({
          place_id: `daso_phone_${phone.replace(/\D/g, '')}`,
          name,
          phone,
          whatsapp_link,
          formatted_address: cityName,
          website: null,
          rating: null,
          user_ratings_total: null,
          business_status: 'OPERATIONAL',
          types: [categoryQuery],
          weakness_score: score,
          weakness_reasons: reasons,
          whatsapp_message,
          is_mobile: isMobileNumber(phone),
          email: null,
          email_subject: emailPitch.subject,
          email_body: emailPitch.body,
        });
      }
    }

    leads.sort((a, b) => b.weakness_score - a.weakness_score);
    return leads;
  } catch {
    return [];
  }
}
