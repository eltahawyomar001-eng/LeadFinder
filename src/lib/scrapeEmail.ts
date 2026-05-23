import type { PitchLang } from '@/types';

export interface WebsiteAnalysis {
  email: string | null;
  builder: string | null;    // 'Wix' | 'Jimdo' | 'IONOS' | etc.
  isModern: boolean;         // Next.js, Nuxt, Gatsby, Webflow — already has a good site
  hasViewport: boolean;      // mobile-responsive
  isHttps: boolean;
  language: PitchLang | 'unknown';
}

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const IGNORE_DOMAINS = new Set([
  'gmail.com', 'gmx.de', 'gmx.net', 'gmx.at', 'gmx.ch',
  'web.de', 'freenet.de', 't-online.de', 'hotmail.com', 'outlook.com',
  'yahoo.com', 'yahoo.de', 'icloud.com', 'me.com',
  'example.com', 'sentry.io', 'w3.org', 'schema.org', 'facebook.com',
  'instagram.com', 'twitter.com', 'linkedin.com', 'xing.com',
]);

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractEmail(html: string): string | null {
  const mailtoMatches = [...html.matchAll(/href=["']mailto:([^"'?&\s]+)/gi)]
    .map((m) => m[1].toLowerCase());
  const rawMatches = [...html.matchAll(EMAIL_RE)]
    .map((m) => m[0].toLowerCase());

  const candidates = [...new Set([...mailtoMatches, ...rawMatches])];

  const valid = candidates.filter((e) => {
    const domain = e.split('@')[1];
    if (!domain) return false;
    if (IGNORE_DOMAINS.has(domain)) return false;
    if (/\.(png|jpg|gif|svg|ico|css|js|woff|ttf)$/.test(domain)) return false;
    return true;
  });

  const preferred = valid.find((e) => !/^(noreply|no-reply|admin|webmaster|postmaster|donotreply)@/.test(e));
  return preferred ?? valid[0] ?? null;
}

function detectBuilder(html: string, url: string): string | null {
  const h = html.toLowerCase();
  if (h.includes('static.wixstatic.com') || h.includes('wix.com/_api') || url.includes('.wixsite.com')) return 'Wix';
  if (h.includes('jimdo.com') || h.includes('jimdofree.com') || h.includes('jimdosite.com')) return 'Jimdo';
  if (h.includes('ionos-homepage') || h.includes('1und1.de') || h.includes('mein1und1') || h.includes('homepage-baukasten')) return 'IONOS';
  if (h.includes('godaddysites.com') || h.includes('secureserver.net/hosted_images')) return 'GoDaddy';
  if (h.includes('squarespace.com') || h.includes('sqsp.net')) return 'Squarespace';
  if (h.includes('weebly.com') || h.includes('weeblycloud.com')) return 'Weebly';
  if (h.includes('mystrikingly.com') || h.includes('strikingly.com')) return 'Strikingly';
  if (h.includes('yolasite.com') || h.includes('yola.com')) return 'Yola';
  if (h.includes('homepage-erstellen.de') || h.includes('sitebuilder.de')) return 'Homepage-Baukasten';
  return null;
}

function detectModern(html: string): boolean {
  return (
    html.includes('__NEXT_DATA__') ||
    html.includes('__nuxt') ||
    html.includes('___gatsby') ||
    html.includes('svelte') && html.includes('__sveltekit') ||
    (html.includes('webflow.com') && html.includes('data-wf-'))
  );
}

function detectLanguage(html: string): PitchLang | 'unknown' {
  const langAttr = html.match(/<html[^>]+lang=['"]([^'"]+)['"]/i)?.[1]?.toLowerCase() ?? '';
  if (langAttr.startsWith('ar')) return 'ar';
  if (langAttr.startsWith('en')) return 'en';
  if (langAttr.startsWith('de')) return 'de';
  // Arabic Unicode block
  if (/[؀-ۿ]{10,}/.test(html)) return 'ar';
  if (html.includes('dir="rtl"') || html.includes("dir='rtl'")) return 'ar';
  return 'unknown';
}

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const empty: WebsiteAnalysis = {
    email: null, builder: null, isModern: false,
    hasViewport: false, isHttps: url.startsWith('https://'), language: 'unknown',
  };
  try {
    const base = new URL(url);
    const origin = base.origin;

    const pages = [
      url,
      `${origin}/impressum`,
      `${origin}/impressum.html`,
      `${origin}/impressum/`,
      `${origin}/kontakt`,
      `${origin}/kontakt.html`,
      `${origin}/contact`,
      `${origin}/about`,
      `${origin}/ueber-uns`,
    ];

    let email: string | null = null;
    let builder: string | null = null;
    let isModern = false;
    let hasViewport = false;
    let language: PitchLang | 'unknown' = 'unknown';
    let analyzed = false;

    for (const page of pages) {
      try {
        const html = await fetchHtml(page);

        // Only analyze quality from the main page (first fetch)
        if (!analyzed) {
          builder = detectBuilder(html, url);
          isModern = detectModern(html);
          hasViewport = html.toLowerCase().includes('name="viewport"');
          language = detectLanguage(html);
          analyzed = true;
        }

        if (!email) {
          email = extractEmail(html);
        }

        // Stop early once we have email and analyzed quality
        if (email && analyzed) break;
      } catch {
        continue;
      }
    }

    return {
      email,
      builder,
      isModern,
      hasViewport,
      isHttps: url.startsWith('https://'),
      language,
    };
  } catch {
    return empty;
  }
}

// Backward-compat wrapper — routes that only need email can still use this
export async function scrapeEmailFromWebsite(url: string): Promise<string | null> {
  const analysis = await analyzeWebsite(url);
  return analysis.email;
}
