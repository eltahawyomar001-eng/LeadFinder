import type { PitchLang } from '@/types';

export interface WebsiteAnalysis {
  email: string | null;
  builder: string | null;
  isModern: boolean;
  hasViewport: boolean;
  isHttps: boolean;
  language: PitchLang | 'unknown';
  pageTitle: string | null;
  metaDescription: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Only block clearly non-business domains — NOT gmx/web.de which German SMBs use heavily
const IGNORE_DOMAINS = new Set([
  'example.com', 'sentry.io', 'w3.org', 'schema.org',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'linkedin.com', 'xing.com', 'youtube.com', 'tiktok.com',
  'google.com', 'googleapis.com', 'gstatic.com',
  'wixpress.com', 'squarespace.com', 'shopify.com',
  'amazonaws.com', 'cloudfront.net', 'fastly.net',
]);

const IGNORE_PREFIXES = new Set([
  'noreply', 'no-reply', 'donotreply', 'do-not-reply',
  'admin', 'webmaster', 'postmaster', 'mailer-daemon',
  'bounce', 'bounces',
]);

// Contact-like URL path segments — all major world languages
const CONTACT_SLUGS = [
  // ── German ────────────────────────────────────────────
  'impressum', 'kontakt', 'kontaktieren', 'ueber-uns', 'über-uns',
  'anfahrt', 'oeffnungszeiten', 'datenschutz', 'datenschutzerklaerung',
  // ── English ───────────────────────────────────────────
  'contact', 'contact-us', 'about', 'about-us', 'get-in-touch',
  'reach-us', 'reach-out', 'team', 'our-team', 'find-us',
  'connect', 'enquire', 'enquiries', 'help', 'support',
  // ── French ────────────────────────────────────────────
  'contactez-nous', 'nous-contacter', 'a-propos', 'qui-sommes-nous',
  'mentions-legales', 'coordonnees', 'plan-dacces', 'nous-joindre',
  // ── Spanish ───────────────────────────────────────────
  'contacto', 'contactar', 'sobre-nosotros', 'quienes-somos',
  'donde-estamos', 'encuentranos', 'escribenos', 'aviso-legal',
  // ── Italian ───────────────────────────────────────────
  'contatti', 'contattaci', 'chi-siamo', 'dove-siamo', 'scrivici',
  // ── Portuguese ────────────────────────────────────────
  'contato', 'contacto', 'fale-conosco', 'sobre-nos', 'quem-somos',
  'fale-connosco', 'entre-em-contacto',
  // ── Dutch ─────────────────────────────────────────────
  'over-ons', 'neem-contact-op', 'bereikbaarheid', 'contacteer-ons',
  // ── Polish ────────────────────────────────────────────
  'o-nas', 'znajdz-nas', 'skontaktuj-sie',
  // ── Turkish ───────────────────────────────────────────
  'iletisim', 'hakkimizda', 'bize-ulasin', 'bize-yazin',
  // ── Swedish / Nordic ──────────────────────────────────
  'kontakta-oss', 'om-oss', 'hitta-oss',
  // ── Russian ───────────────────────────────────────────
  'kontakty', 'o-nas', 'svyazatsya',
  // ── Arabic ────────────────────────────────────────────
  'اتصل', 'تواصل', 'من-نحن', 'اتصل-بنا', 'تواصل-معنا',
  // ── Multilingual path prefixes ────────────────────────
  'en/contact', 'en/about', 'de/kontakt', 'fr/contact',
  'es/contacto', 'it/contatti', 'nl/contact', 'pt/contacto',
];

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchHtml(url: string, timeoutMs = 8_000): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8,ar;q=0.7',
      'Accept-Encoding': 'gzip, deflate',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // Only read first 300 KB — enough to find any email, avoids huge payloads
  const reader = res.body?.getReader();
  if (!reader) return res.text();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < 300_000) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.length;
  }
  reader.cancel();
  return new TextDecoder().decode(
    chunks.reduce((acc, c) => { const t = new Uint8Array(acc.length + c.length); t.set(acc); t.set(c, acc.length); return t; }, new Uint8Array(0))
  );
}

// ─── Email extraction ─────────────────────────────────────────────────────────

function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&#64;|&commat;/gi, '@')
    .replace(/&#46;/gi, '.')
    .replace(/&amp;/gi, '&')
    .replace(/&#x40;/gi, '@')
    .replace(/\\u0040/gi, '@')
    .replace(/\[dot\]/gi, '.').replace(/\(dot\)/gi, '.').replace(/\s+dot\s+/gi, '.')
    .replace(/\[at\]/gi, '@').replace(/\(at\)/gi, '@').replace(/\s+(?:AT|at)\s+/gi, '@');
}

function scoreEmail(email: string): number {
  const [local, domain] = email.split('@');
  if (!domain) return -1;
  // Prefer business-domain emails over free providers
  const freeDomains = new Set([
    // Global
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'me.com',
    'live.com', 'msn.com', 'aol.com', 'protonmail.com', 'pm.me',
    // German
    'yahoo.de', 'gmx.de', 'gmx.net', 'web.de', 't-online.de',
    // French
    'wanadoo.fr', 'orange.fr', 'free.fr', 'laposte.net', 'sfr.fr', 'hotmail.fr', 'yahoo.fr',
    // UK
    'btinternet.com', 'sky.com', 'talktalk.net', 'virginmedia.com', 'hotmail.co.uk', 'yahoo.co.uk',
    // Other regional
    'libero.it', 'tin.it', 'alice.it', 'terra.com.br', 'uol.com.br',
    'mail.ru', 'yandex.ru', 'list.ru', 'bk.ru',
  ]);
  let score = freeDomains.has(domain) ? 0 : 10;
  // Prefer short local parts (info@, contact@, hallo@) over long random ones
  if (local.length < 20) score += 3;
  // Penalise no-reply style prefixes
  if (IGNORE_PREFIXES.has(local.replace(/[^a-z]/g, ''))) score -= 20;
  // Bonus for common business contact prefixes
  if (/^(info|hallo|hello|contact|kontakt|anfrage|mail|office)/.test(local)) score += 5;
  return score;
}

function extractEmails(rawHtml: string): string[] {
  const html = decodeHtmlEntities(rawHtml);

  const candidates = new Set<string>();

  // 1. mailto: links — most reliable
  for (const m of html.matchAll(/href=["']mailto:([^"'?&\s<>]+)/gi)) {
    candidates.add(m[1].toLowerCase().trim());
  }

  // 2. JSON-LD schema.org email field
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const json = JSON.parse(m[1]);
      const pick = (obj: unknown): void => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) { obj.forEach(pick); return; }
        const o = obj as Record<string, unknown>;
        if (typeof o.email === 'string') candidates.add(o.email.toLowerCase().trim());
        Object.values(o).forEach(pick);
      };
      pick(json);
    } catch { /* malformed JSON — skip */ }
  }

  // 3. data-email / data-mail attributes (obfuscation pattern)
  for (const m of html.matchAll(/data-(?:email|mail|contact)=["']([^"']+)["']/gi)) {
    candidates.add(m[1].toLowerCase().trim());
  }

  // 4. Raw regex on decoded HTML
  for (const m of html.matchAll(EMAIL_RE)) {
    candidates.add(m[0].toLowerCase());
  }

  // Filter and rank
  return [...candidates]
    .filter((e) => {
      const [, domain] = e.split('@');
      if (!domain || domain.length < 3) return false;
      if (IGNORE_DOMAINS.has(domain)) return false;
      if (/\.(png|jpg|gif|svg|ico|css|js|woff|ttf|woff2|mp4)$/.test(domain)) return false;
      if (e.includes('..') || e.startsWith('.') || e.endsWith('.')) return false;
      if (e.length > 80) return false;
      return true;
    })
    .sort((a, b) => scoreEmail(b) - scoreEmail(a));
}

// ─── Page discovery ───────────────────────────────────────────────────────────

function discoverContactLinks(html: string, origin: string): string[] {
  const found = new Set<string>();

  // Scan all href attributes on the page
  for (const m of html.matchAll(/href=["']([^"'#?]+)["']/gi)) {
    const href = m[1].trim();
    const lower = href.toLowerCase();
    if (!CONTACT_SLUGS.some((slug) => lower.includes(slug))) continue;
    try {
      const abs = new URL(href, origin).href;
      if (abs.startsWith(origin)) found.add(abs);
    } catch { /* relative URL parsing failed */ }
  }

  return [...found].slice(0, 8); // cap to avoid runaway
}

async function discoverSitemapUrls(origin: string): Promise<string[]> {
  try {
    const xml = await fetchHtml(`${origin}/sitemap.xml`, 5_000);
    const urls: string[] = [];
    for (const m of xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
      const url = m[1].trim();
      if (CONTACT_SLUGS.some((slug) => url.toLowerCase().includes(slug))) {
        urls.push(url);
      }
    }
    return urls.slice(0, 5);
  } catch {
    return [];
  }
}

// ─── Site analysis ────────────────────────────────────────────────────────────

function detectBuilder(html: string, url: string): string | null {
  const h = html.toLowerCase();
  if (h.includes('static.wixstatic.com') || h.includes('wix.com/_api') || url.includes('.wixsite.com')) return 'Wix';
  if (h.includes('jimdo.com') || h.includes('jimdofree.com') || h.includes('jimdosite.com')) return 'Jimdo';
  if (h.includes('ionos-homepage') || h.includes('mein1und1') || h.includes('homepage-baukasten')) return 'IONOS';
  if (h.includes('godaddysites.com') || h.includes('secureserver.net/hosted_images')) return 'GoDaddy';
  if (h.includes('squarespace.com') || h.includes('sqsp.net')) return 'Squarespace';
  if (h.includes('weebly.com') || h.includes('weeblycloud.com')) return 'Weebly';
  if (h.includes('mystrikingly.com') || h.includes('strikingly.com')) return 'Strikingly';
  if (h.includes('yolasite.com') || h.includes('yola.com')) return 'Yola';
  if (h.includes('homepage-erstellen.de') || h.includes('sitebuilder.de')) return 'Baukasten';
  if (h.includes('pagefly') || h.includes('myshopify.com')) return 'Shopify';
  return null;
}

function detectModern(html: string): boolean {
  return (
    html.includes('__NEXT_DATA__') ||
    html.includes('__nuxt') ||
    html.includes('___gatsby') ||
    (html.includes('__sveltekit') && html.includes('svelte')) ||
    (html.includes('webflow.com') && html.includes('data-wf-'))
  );
}

function detectLanguage(html: string): PitchLang | 'unknown' {
  const langAttr = html.match(/<html[^>]+lang=['"]([^'"]{2,10})['"]/i)?.[1]?.toLowerCase() ?? '';
  if (langAttr.startsWith('ar')) return 'ar';
  if (langAttr.startsWith('en')) return 'en';
  if (langAttr.startsWith('de')) return 'de';
  if (/[؀-ۿ]{10,}/.test(html)) return 'ar';
  if (html.includes('dir="rtl"') || html.includes("dir='rtl'")) return 'ar';
  return 'unknown';
}

function extractMeta(html: string): { title: string | null; description: string | null } {
  const titleMatch = html.match(/<title[^>]*>([^<]{1,120})<\/title>/i);
  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,200})["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']{1,200})["'][^>]+name=["']description["']/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : null;
  const description = descMatch ? descMatch[1].trim().replace(/\s+/g, ' ') : null;
  return { title, description };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const empty: WebsiteAnalysis = {
    email: null, builder: null, isModern: false,
    hasViewport: false, isHttps: url.startsWith('https://'),
    language: 'unknown', pageTitle: null, metaDescription: null,
  };

  try {
    const base = new URL(url);
    const origin = base.origin;

    // ── Step 1: fetch main page ───────────────────────────────────────────────
    let mainHtml = '';
    try { mainHtml = await fetchHtml(url); } catch { return empty; }

    const builder = detectBuilder(mainHtml, url);
    const isModern = detectModern(mainHtml);
    const hasViewport = mainHtml.toLowerCase().includes('name="viewport"');
    const language = detectLanguage(mainHtml);
    const { title: pageTitle, description: metaDescription } = extractMeta(mainHtml);

    // ── Step 2: discover all contact pages in parallel ────────────────────────
    const hardcoded = CONTACT_SLUGS.flatMap((slug) => [
      `${origin}/${slug}`,
      `${origin}/${slug}.html`,
      `${origin}/${slug}/`,
    ]);

    const discovered = discoverContactLinks(mainHtml, origin);

    // Run sitemap discovery concurrently while we already have pages to try
    const [sitemapUrls] = await Promise.allSettled([discoverSitemapUrls(origin)]);
    const fromSitemap = sitemapUrls.status === 'fulfilled' ? sitemapUrls.value : [];

    // Merge: discovered links first (most likely correct), then hardcoded + sitemap
    const allPages = [
      url,
      ...discovered,
      ...fromSitemap,
      ...hardcoded,
    ];

    // Deduplicate
    const uniquePages = [...new Set(allPages)].slice(0, 20);

    // ── Step 3: fetch all pages in parallel (concurrency = 6) ─────────────────
    const CONCURRENCY = 6;
    const allEmails: string[] = [];

    // Extract from main page first (already have it)
    allEmails.push(...extractEmails(mainHtml));

    // Batch remaining pages with concurrency limit
    const remaining = uniquePages.filter((p) => p !== url);
    for (let i = 0; i < remaining.length; i += CONCURRENCY) {
      const batch = remaining.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map((p) => fetchHtml(p)));
      for (const r of results) {
        if (r.status === 'fulfilled') {
          allEmails.push(...extractEmails(r.value));
        }
      }
      // Stop early if we already have a high-quality email
      if (allEmails.some((e) => scoreEmail(e) >= 10)) break;
    }

    // Pick best email across all pages
    const ranked = [...new Set(allEmails)].sort((a, b) => scoreEmail(b) - scoreEmail(a));
    const email = ranked[0] ?? null;

    return { email, builder, isModern, hasViewport, isHttps: url.startsWith('https://'), language, pageTitle, metaDescription };
  } catch {
    return empty;
  }
}

export async function scrapeEmailFromWebsite(url: string): Promise<string | null> {
  return (await analyzeWebsite(url)).email;
}
