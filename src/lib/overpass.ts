import type { Lead } from '@/types';
import { formatPhoneForWhatsApp, generateWhatsAppMessage, generateEmailPitch, isMobileNumber } from './whatsapp';
import { scoreWeakness } from './scoring';
import { scrapeEmailFromWebsite } from './scrapeEmail';

// Maps our category query strings → OpenStreetMap key=value tag pairs
const OSM_TAGS: Record<string, Array<[string, string]>> = {
  'Restaurant':                         [['amenity', 'restaurant']],
  'Cafe Bäckerei':                      [['amenity', 'cafe'], ['shop', 'bakery']],
  'Hotel Pension':                      [['tourism', 'hotel'], ['tourism', 'guest_house']],
  'Arztpraxis Allgemeinmedizin':        [['amenity', 'doctors'], ['healthcare', 'doctor']],
  'Zahnarzt Zahnarztpraxis':            [['amenity', 'dentist']],
  'Friseur Friseursalon':               [['shop', 'hairdresser']],
  'Autowerkstatt KFZ':                  [['shop', 'car_repair']],
  'Immobilienmakler Immobilien':        [['office', 'estate_agent']],
  'Versicherungsmakler Versicherung':   [['office', 'insurance']],
  'Steuerberater Steuerberatung':       [['office', 'tax_advisor'], ['office', 'accountant']],
  'Rechtsanwalt Kanzlei':              [['office', 'lawyer']],
  'Physiotherapeut Physiotherapie':     [['healthcare', 'physiotherapist']],
  'Fitnessstudio Gym':                  [['leisure', 'fitness_centre']],
  'Apotheke':                           [['amenity', 'pharmacy']],
  'Elektriker Elektrikbetrieb':         [['craft', 'electrician']],
  'Klempner Sanitär Heizung':           [['craft', 'plumber']],
  'Maler Malerbetrieb':                 [['craft', 'painter']],
  'Fotograf Fotostudio':                [['shop', 'photographer']],
  'Werbeagentur Marketing Agentur':     [['office', 'advertising_agency']],
  'Buchhalter Buchhaltung':             [['office', 'accountant']],
  'Tierarzt Tierarztpraxis':            [['amenity', 'veterinary']],
  'Optiker Augenoptiker':               [['shop', 'optician']],
  'Reinigungsunternehmen Gebäudereinigung': [['craft', 'cleaning']],
  'Reisebüro Reiseagentur':             [['shop', 'travel_agency']],
  'Sprachschule Sprachkurs':            [['amenity', 'language_school']],
  'Blumenladen Blumenhändler':          [['shop', 'florist']],
  'Juwelier Schmuckgeschäft':           [['shop', 'jewelry']],
  'Umzugsunternehmen Umzugsfirma':      [['office', 'moving_company']],
  'Druckerei Digitaldruck':             [['craft', 'printer']],
  'IT Service IT Dienstleistungen':     [['office', 'it']],
};

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function buildQuery(tags: Array<[string, string]>, lat: number, lng: number, radiusM: number): string {
  const filters = tags.flatMap(([k, v]) => [
    `node["${k}"="${v}"](around:${radiusM},${lat},${lng});`,
    `way["${k}"="${v}"](around:${radiusM},${lat},${lng});`,
  ]);
  return `[out:json][timeout:30];\n(\n  ${filters.join('\n  ')}\n);\nout center body;`;
}

function formatAddress(tags: Record<string, string>): string {
  const parts = [
    tags['addr:street'] && tags['addr:housenumber']
      ? `${tags['addr:street']} ${tags['addr:housenumber']}`
      : tags['addr:street'],
    tags['addr:postcode'],
    tags['addr:city'],
    tags['addr:country'] ?? 'Deutschland',
  ].filter(Boolean);
  return parts.join(', ') || 'Adresse nicht verfügbar';
}

function getPhone(tags: Record<string, string>): string | null {
  return tags['phone'] ?? tags['contact:phone'] ?? tags['telephone'] ?? null;
}

function getWebsite(tags: Record<string, string>): string | null {
  const w = tags['website'] ?? tags['contact:website'] ?? tags['url'] ?? null;
  if (!w) return null;
  try { new URL(w); return w; } catch { return null; }
}

export async function searchOverpass(
  categoryQuery: string,
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<Lead[]> {
  // Fall back to amenity=yes if no known tag
  const tags: Array<[string, string]> = OSM_TAGS[categoryQuery]
    ?? categoryQuery.split(' ').slice(0, 1).map((word): [string, string] => ['name', word]);

  const query = buildQuery(tags, lat, lng, radiusMeters);

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(35_000),
  });

  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);

  const data: OverpassResponse = await res.json();

  // Deduplicate by OSM id, filter out unnamed elements
  const seen = new Set<number>();
  const leads: Lead[] = [];

  for (const el of data.elements) {
    if (seen.has(el.id)) continue;
    seen.add(el.id);

    const tags = el.tags ?? {};
    const name = tags['name'];
    if (!name) continue;

    const phone = getPhone(tags);
    const website = getWebsite(tags);
    const address = formatAddress(tags);
    const rating = null; // OSM doesn't have ratings
    const totalRatings = null;

    const { score, reasons } = scoreWeakness(website, rating, totalRatings);
    const whatsapp_link = phone ? formatPhoneForWhatsApp(phone) : null;
    const whatsapp_message = generateWhatsAppMessage(name, reasons);
    const emailPitch = generateEmailPitch(name, reasons);
    // Email scraping happens after — placeholder null here, filled by route
    leads.push({
      place_id: `osm_${el.type}_${el.id}`,
      name,
      phone: phone ?? null,
      whatsapp_link,
      formatted_address: address,
      website: website ?? null,
      rating,
      user_ratings_total: totalRatings,
      business_status: tags['opening_hours'] === 'closed' ? 'CLOSED_PERMANENTLY' : 'OPERATIONAL',
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

  // Sort highest score first
  leads.sort((a, b) => b.weakness_score - a.weakness_score);
  return leads;
}
