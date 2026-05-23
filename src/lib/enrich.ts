import type { Lead, PitchLang } from '@/types';
import type { WebsiteAnalysis } from './scrapeEmail';
import { generateEmailPitch } from './whatsapp';

function qualityBonus(
  analysis: WebsiteAnalysis,
  hasWebsite: boolean,
  lang: PitchLang,
): { extraScore: number; extraReasons: string[] } {
  // If already a modern professional site, lower the priority — they don't need us
  if (analysis.isModern) {
    return { extraScore: -4, extraReasons: [] };
  }

  let extraScore = 0;
  const extraReasons: string[] = [];

  if (analysis.builder) {
    extraScore += 3;
    extraReasons.push(
      lang === 'ar'
        ? `الموقع مبني على نظام رخيص (${analysis.builder}) ويحتاج تطويرًا احترافيًا`
        : lang === 'en'
        ? `Website built on a basic builder (${analysis.builder}) — needs a proper professional site`
        : `Website basiert auf dem Baukasten-System ${analysis.builder} — professionelles Upgrade nötig`,
    );
  }

  if (hasWebsite && !analysis.hasViewport) {
    extraScore += 2;
    extraReasons.push(
      lang === 'ar'
        ? 'الموقع غير متوافق مع الأجهزة المحمولة'
        : lang === 'en'
        ? 'Website is not mobile-optimized'
        : 'Website ist nicht mobiloptimiert',
    );
  }

  if (!analysis.isHttps && hasWebsite) {
    extraScore += 1;
    extraReasons.push(
      lang === 'ar'
        ? 'الموقع يفتقر إلى شهادة SSL (HTTPS)'
        : lang === 'en'
        ? 'Website lacks SSL — no HTTPS'
        : 'Website hat noch kein SSL-Zertifikat (HTTPS)',
    );
  }

  return { extraScore, extraReasons };
}

export function enrichLeadWithAnalysis(
  lead: Lead,
  analysis: WebsiteAnalysis,
  countryLang: PitchLang = 'de',
): void {
  lead.email = analysis.email;

  if (analysis.builder) {
    lead.website_builder = analysis.builder;
  }

  const detectedLang: PitchLang =
    analysis.language !== 'unknown' ? analysis.language : countryLang;

  const { extraScore, extraReasons } = qualityBonus(analysis, !!lead.website, detectedLang);

  lead.weakness_score = Math.max(0, Math.min(10, lead.weakness_score + extraScore));

  if (extraReasons.length > 0) {
    lead.weakness_reasons = [...extraReasons, ...lead.weakness_reasons].slice(0, 3);
  }

  const pitch = generateEmailPitch(lead.name, lead.weakness_reasons, detectedLang);
  lead.email_subject = pitch.subject;
  lead.email_body = pitch.body;
}
