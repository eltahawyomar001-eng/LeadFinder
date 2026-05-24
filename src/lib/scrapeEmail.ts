import { promises as dnsPromises } from 'dns';
import type { PitchLang } from '@/types';

export interface WebsiteAnalysis {
  email: string | null;
  phone: string | null;
  builder: string | null;
  isModern: boolean;
  hasViewport: boolean;
  isHttps: boolean;
  language: PitchLang | 'unknown';
  pageTitle: string | null;
  metaDescription: string | null;
  copyrightYear: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const IGNORE_DOMAINS = new Set([
  'example.com', 'sentry.io', 'w3.org', 'schema.org',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'linkedin.com', 'xing.com', 'youtube.com', 'tiktok.com',
  'google.com', 'googleapis.com', 'gstatic.com',
  'wixpress.com', 'squarespace.com', 'shopify.com',
  'amazonaws.com', 'cloudfront.net', 'fastly.net',
]);

const IGNORE_PREFIXES = new Set([
  'noreply', 'noreply', 'donotreply', 'donotreply',
  'admin', 'webmaster', 'postmaster', 'mailerdaemon',
  'bounce', 'bounces',
]);

// High-value contact page slugs — tried with priority
const PRIORITY_SLUGS = [
  // German (most important for this app)
  'impressum', 'kontakt', 'kontaktieren', 'ueber-uns', 'uber-uns',
  // English
  'contact', 'contact-us', 'about', 'about-us', 'get-in-touch',
  'reach-us', 'team', 'our-team', 'support', 'help',
  // French
  'contactez-nous', 'nous-contacter', 'mentions-legales',
  // Spanish
  'contacto', 'contactar', 'sobre-nosotros',
  // Italian
  'contatti', 'contattaci', 'chi-siamo',
  // Portuguese
  'contato', 'fale-conosco',
  // Dutch
  'over-ons', 'neem-contact-op',
  // Turkish
  'iletisim', 'hakkimizda',
  // Swedish
  'kontakta-oss', 'om-oss',
  // Multilingual prefixes
  'en/contact', 'en/about', 'de/kontakt', 'de/impressum',
];

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchHtml(url: string, timeoutMs = 7_000): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate',
    },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
    chunks.reduce((acc, c) => {
      const t = new Uint8Array(acc.length + c.length);
      t.set(acc); t.set(c, acc.length);
      return t;
    }, new Uint8Array(0))
  );
}

// Try HTTPS first, fallback to HTTP if the host rejects HTTPS
async function fetchHtmlWithFallback(url: string, timeoutMs = 7_000): Promise<string> {
  try {
    return await fetchHtml(url, timeoutMs);
  } catch {
    if (url.startsWith('https://')) {
      return await fetchHtml(url.replace('https://', 'http://'), timeoutMs);
    }
    throw new Error('fetch failed');
  }
}

// ─── Domain email guessing ────────────────────────────────────────────────────

// Common business email prefixes in priority order (German-first, then international)
const GUESS_PREFIXES = [
  'info', 'kontakt', 'contact', 'hallo', 'mail',
  'office', 'anfrage', 'service', 'hello', 'team',
];

// Verify the domain actually receives email (has MX records) before guessing
async function hasMxRecords(domain: string): Promise<boolean> {
  try {
    const records = await dnsPromises.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

async function guessEmailFromDomain(website: string): Promise<string | null> {
  try {
    const domain = new URL(website).hostname.replace(/^www\./, '');
    if (!domain || domain.split('.').length < 2) return null;
    const hasMx = await hasMxRecords(domain);
    if (!hasMx) return null;

    // Pick best prefix based on domain language/TLD
    const isGerman = domain.endsWith('.de') || domain.endsWith('.at') || domain.endsWith('.ch');
    const isArabic = domain.endsWith('.ae') || domain.endsWith('.sa') || domain.endsWith('.eg') || domain.endsWith('.ma');
    const prefix = isGerman ? 'info' : isArabic ? 'info' : 'info';

    // If the domain looks like a personal name (e.g. max-mustermann.de), try first-name prefix
    const namePart = domain.split('.')[0].replace(/-/g, '');
    const mightBePersonal = /^[a-z]{3,12}$/.test(namePart) && !['shop','store','web','site','online','news','blog','media'].includes(namePart);
    if (mightBePersonal && isGerman) {
      return `${namePart}@${domain}`;
    }

    return `${prefix}@${domain}`;
  } catch {
    return null;
  }
}

// ─── Decoders ─────────────────────────────────────────────────────────────────

// Cloudflare email protection: <span data-cfemail="HEX"> XOR decode
function decodeCfEmail(encoded: string): string {
  const r = parseInt(encoded.slice(0, 2), 16);
  let email = '';
  for (let n = 2; n < encoded.length; n += 2) {
    email += String.fromCharCode(parseInt(encoded.slice(n, n + 2), 16) ^ r);
  }
  return email;
}

// Full HTML entity decode (decimal + hex + common named + obfuscation patterns)
function decodeHtmlEntities(html: string): string {
  return html
    // Decimal numeric entities: &#110; → n
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    // Hex numeric entities: &#x6e; → n
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    // Unicode JS escapes: @ → @
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    // Named entities
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    // Obfuscation patterns
    .replace(/\[dot\]/gi, '.').replace(/\(dot\)/gi, '.').replace(/\s+dot\s+/gi, '.')
    .replace(/\[at\]/gi, '@').replace(/\(at\)/gi, '@').replace(/\s+(?:AT|at)\s+/gi, '@')
    // Reverse obfuscation: email encoded as reversed string in some templates
    // (handled downstream via reversedEmailExtract)
    ;
}

// ROT13 decode (some sites use it for email obfuscation)
function rot13(s: string): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

// ─── Email extraction ─────────────────────────────────────────────────────────

function scoreEmail(email: string): number {
  const [local, domain] = email.split('@');
  if (!domain) return -1;
  const freeDomains = new Set([
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'me.com',
    'live.com', 'msn.com', 'aol.com', 'protonmail.com', 'pm.me',
    'yahoo.de', 'gmx.de', 'gmx.net', 'web.de', 't-online.de',
    'wanadoo.fr', 'orange.fr', 'free.fr', 'laposte.net', 'sfr.fr',
    'btinternet.com', 'sky.com', 'talktalk.net', 'virginmedia.com',
    'libero.it', 'tin.it', 'alice.it', 'mail.ru', 'yandex.ru',
  ]);
  let score = freeDomains.has(domain) ? 0 : 10;
  if (local.length < 20) score += 3;
  if (IGNORE_PREFIXES.has(local.replace(/[^a-z]/g, ''))) score -= 20;
  if (/^(info|hallo|hello|contact|kontakt|anfrage|mail|office|hola|bonjour)/.test(local)) score += 5;
  // Prefer emails whose domain matches the site's domain (most authoritative)
  score += 2; // bumped when we know — caller can adjust
  return score;
}

function extractEmailsFromHtml(rawHtml: string): string[] {
  // Full decode first
  const html = decodeHtmlEntities(rawHtml);
  const candidates = new Set<string>();

  // 1. Cloudflare email protection — data-cfemail="HEX"
  for (const m of html.matchAll(/data-cfemail=["']([0-9a-fA-F]+)["']/gi)) {
    try {
      const decoded = decodeCfEmail(m[1]);
      if (decoded.includes('@')) candidates.add(decoded.toLowerCase().trim());
    } catch { /* bad encoding */ }
  }

  // 2. mailto: links — most reliable
  for (const m of html.matchAll(/href=["']mailto:([^"'?&\s<>]+)/gi)) {
    candidates.add(m[1].toLowerCase().trim());
  }

  // 3. JSON-LD schema.org email field
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
    } catch { /* malformed JSON */ }
  }

  // 4. data-email / data-mail attributes (JS obfuscation)
  for (const m of html.matchAll(/data-(?:email|mail|contact|address)=["']([^"']+)["']/gi)) {
    const v = decodeHtmlEntities(m[1]).toLowerCase().trim();
    if (v.includes('@')) candidates.add(v);
  }

  // 5. JavaScript string assignments: email = "...", "email":"...", window.email, etc.
  const jsPatterns = [
    /["']email["']\s*:\s*["']([^"']+@[^"']+)["']/gi,
    /(?:var|let|const)\s+email\s*=\s*["']([^"']+@[^"']+)["']/gi,
    /window\.email\s*=\s*["']([^"']+@[^"']+)["']/gi,
    /email\s*=\s*["']([^"']{3,60}@[^"']{3,40})["']/gi,
    /mailto\\*["']?\s*\+?\s*["']([^"']{3,60}@[^"']{3,40})["']/gi,
  ];
  for (const pattern of jsPatterns) {
    for (const m of html.matchAll(pattern)) {
      const v = m[1].toLowerCase().trim();
      if (v.includes('@') && !v.includes(' ')) candidates.add(v);
    }
  }

  // 6. ROT13-encoded emails (some WordPress plugins use this)
  for (const m of html.matchAll(/class=["'][^"']*rot13[^"']*["'][^>]*>([^<]{5,80})</gi)) {
    const decoded = rot13(m[1]).toLowerCase().trim();
    if (decoded.includes('@')) candidates.add(decoded);
  }
  // data-rot13 attributes
  for (const m of html.matchAll(/data-rot13=["']([^"']{5,80})["']/gi)) {
    const decoded = rot13(m[1]).toLowerCase().trim();
    if (decoded.includes('@')) candidates.add(decoded);
  }

  // 7. Reversed email strings (direction:rtl trick)
  for (const m of html.matchAll(/class=["'][^"']*(?:reversed|rtl|rev-email)[^"']*["'][^>]*>([^<]{5,80})</gi)) {
    const reversed = m[1].split('').reverse().join('').toLowerCase().trim();
    if (reversed.includes('@')) candidates.add(reversed);
  }

  // 8. Raw regex on fully decoded HTML — last resort, catches anything remaining
  for (const m of html.matchAll(EMAIL_RE)) {
    candidates.add(m[0].toLowerCase());
  }

  // Filter and rank
  return [...candidates]
    .filter((e) => {
      const [, domain] = e.split('@');
      if (!domain || domain.length < 3) return false;
      if (IGNORE_DOMAINS.has(domain)) return false;
      if (/\.(png|jpg|gif|svg|ico|css|js|woff|ttf|woff2|mp4|webp)$/.test(domain)) return false;
      if (e.includes('..') || e.startsWith('.') || e.endsWith('.')) return false;
      if (e.length > 80) return false;
      // Must have a valid TLD (at least 2 chars after final dot)
      if (!/\.[a-z]{2,}$/.test(domain)) return false;
      return true;
    })
    .sort((a, b) => scoreEmail(b) - scoreEmail(a));
}

// ─── Phone extraction ─────────────────────────────────────────────────────────

// International phone regex — handles +49, 0049, 004..., +1, +44, +33, +971, etc.
const PHONE_RE = /(?:\+|00)[\d\s\-().]{7,18}\d|\b0[\d\s\-/().]{6,16}\d/g;

function extractPhones(html: string): string[] {
  // Strip HTML tags first for cleaner matching
  const text = html.replace(/<[^>]+>/g, ' ');
  const found = new Set<string>();
  for (const m of text.matchAll(PHONE_RE)) {
    const clean = m[0].replace(/[\s\-().]/g, '').replace(/^00/, '+');
    if (clean.length >= 7 && clean.length <= 16) found.add(clean);
  }
  // Also check tel: links
  for (const m of html.matchAll(/href=["']tel:([^"'\s]+)["']/gi)) {
    const v = m[1].replace(/[\s\-().]/g, '');
    if (v.length >= 7) found.add(v);
  }
  return [...found];
}

// ─── Page discovery ───────────────────────────────────────────────────────────

function discoverContactLinks(html: string, origin: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/href=["']([^"'#?]+)["']/gi)) {
    const href = m[1].trim();
    const lower = href.toLowerCase();
    if (!PRIORITY_SLUGS.some((slug) => lower.includes(slug))) continue;
    try {
      const abs = new URL(href, origin).href;
      if (abs.startsWith(origin)) found.add(abs);
    } catch { /* skip */ }
  }
  return [...found].slice(0, 10);
}

async function discoverSitemapUrls(origin: string): Promise<string[]> {
  try {
    const xml = await fetchHtml(`${origin}/sitemap.xml`, 4_000);
    const urls: string[] = [];
    for (const m of xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
      const url = m[1].trim();
      if (PRIORITY_SLUGS.some((slug) => url.toLowerCase().includes(slug))) {
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
  if (h.includes('jimdo.com') || h.includes('jimdofree.com')) return 'Jimdo';
  if (h.includes('ionos-homepage') || h.includes('mein1und1')) return 'IONOS';
  if (h.includes('godaddysites.com') || h.includes('secureserver.net')) return 'GoDaddy';
  if (h.includes('squarespace.com') || h.includes('sqsp.net')) return 'Squarespace';
  if (h.includes('weebly.com') || h.includes('weeblycloud.com')) return 'Weebly';
  if (h.includes('mystrikingly.com') || h.includes('strikingly.com')) return 'Strikingly';
  if (h.includes('pagefly') || h.includes('myshopify.com')) return 'Shopify';
  if (h.includes('wordpress') || h.includes('/wp-content/') || h.includes('/wp-includes/')) return 'WordPress';
  if (h.includes('typo3') || h.includes('t3_') || h.includes('typo3conf')) return 'TYPO3';
  if (h.includes('joomla') || h.includes('/components/com_')) return 'Joomla';
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

// Find the most-recent copyright year from footer text (©, (c), or "Copyright")
function extractCopyrightYear(html: string): number | null {
  const text = html.replace(/<[^>]+>/g, ' ');
  const matches: number[] = [];
  const re = /(?:©|&copy;|\(c\)|copyright)\s*(\d{4})(?:\s*[-–]\s*(\d{4}))?/gi;
  for (const m of text.matchAll(re)) {
    const y1 = parseInt(m[1], 10);
    const y2 = m[2] ? parseInt(m[2], 10) : y1;
    if (y1 >= 1990 && y1 <= 2030) matches.push(y2 >= 1990 && y2 <= 2030 ? y2 : y1);
  }
  if (matches.length === 0) return null;
  return Math.max(...matches);
}

function extractMeta(html: string): { title: string | null; description: string | null } {
  const titleMatch = html.match(/<title[^>]*>([^<]{1,120})<\/title>/i);
  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,200})["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']{1,200})["'][^>]+name=["']description["']/i);
  return {
    title: titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : null,
    description: descMatch ? descMatch[1].trim().replace(/\s+/g, ' ') : null,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const empty: WebsiteAnalysis = {
    email: null, phone: null, builder: null, isModern: false,
    hasViewport: false, isHttps: url.startsWith('https://'),
    language: 'unknown', pageTitle: null, metaDescription: null, copyrightYear: null,
  };

  try {
    const base = new URL(url);
    const origin = base.origin;

    // ── Step 1: fetch main page (with http fallback) ──────────────────────────
    let mainHtml = '';
    try {
      mainHtml = await fetchHtmlWithFallback(url);
    } catch {
      return empty;
    }

    const builder = detectBuilder(mainHtml, url);
    const isModern = detectModern(mainHtml);
    const hasViewport = mainHtml.toLowerCase().includes('name="viewport"');
    const language = detectLanguage(mainHtml);
    const { title: pageTitle, description: metaDescription } = extractMeta(mainHtml);
    const copyrightYear = extractCopyrightYear(mainHtml);

    // Extract from main page immediately
    let allEmails = extractEmailsFromHtml(mainHtml);
    let allPhones = extractPhones(mainHtml);

    // Early exit: if we already have a high-quality business email, no need to crawl further
    const hasGoodEmail = () => allEmails.some((e) => scoreEmail(e) >= 13);
    if (hasGoodEmail()) {
      return {
        email: allEmails[0],
        phone: allPhones[0] ?? null,
        builder, isModern, hasViewport,
        isHttps: url.startsWith('https://'),
        language, pageTitle, metaDescription, copyrightYear,
      };
    }

    // ── Step 2: build prioritised page list ───────────────────────────────────

    // High-priority hardcoded pages (top 10 checked in parallel first)
    const topPriority = [
      `${origin}/impressum`,
      `${origin}/kontakt`,
      `${origin}/contact`,
      `${origin}/about`,
      `${origin}/ueber-uns`,
      `${origin}/en/contact`,
      `${origin}/de/kontakt`,
      `${origin}/de/impressum`,
      `${origin}/.well-known/security.txt`, // security contacts, often has real email
      `${origin}/humans.txt`,               // some businesses list team emails here
    ];

    // Discovered links from main page
    const discovered = discoverContactLinks(mainHtml, origin);

    // Sitemap concurrently
    const sitemapPromise = discoverSitemapUrls(origin);

    // ── Step 3: fetch top-priority pages in parallel ──────────────────────────
    const topResults = await Promise.allSettled(
      topPriority.map((p) => fetchHtml(p, 5_000))
    );

    for (const r of topResults) {
      if (r.status === 'fulfilled') {
        allEmails.push(...extractEmailsFromHtml(r.value));
        allPhones.push(...extractPhones(r.value));
      }
    }

    if (hasGoodEmail()) {
      const ranked = [...new Set(allEmails)].sort((a, b) => scoreEmail(b) - scoreEmail(a));
      return {
        email: ranked[0],
        phone: allPhones[0] ?? null,
        builder, isModern, hasViewport,
        isHttps: url.startsWith('https://'),
        language, pageTitle, metaDescription, copyrightYear,
      };
    }

    // ── Step 4: discovered + sitemap pages ────────────────────────────────────
    const sitemapUrls = await sitemapPromise;

    const secondWave = [
      ...discovered,
      ...sitemapUrls,
      // Extended hardcoded slugs not in top priority
      ...PRIORITY_SLUGS
        .filter((s) => !['impressum','kontakt','contact','about','ueber-uns'].includes(s))
        .flatMap((slug) => [`${origin}/${slug}`, `${origin}/${slug}/`]),
    ];

    // Deduplicate against already-fetched pages
    const fetched = new Set([url, ...topPriority]);
    const uniqueSecond = [...new Set(secondWave)].filter((u) => !fetched.has(u)).slice(0, 15);

    const CONCURRENCY = 5;
    for (let i = 0; i < uniqueSecond.length; i += CONCURRENCY) {
      const batch = uniqueSecond.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map((p) => fetchHtml(p, 5_000)));
      for (const r of results) {
        if (r.status === 'fulfilled') {
          allEmails.push(...extractEmailsFromHtml(r.value));
          allPhones.push(...extractPhones(r.value));
        }
      }
      if (hasGoodEmail()) break;
    }

    const ranked = [...new Set(allEmails)].sort((a, b) => scoreEmail(b) - scoreEmail(a));
    const rankedPhones = [...new Set(allPhones)];

    // Last resort: no email found on any page — guess from domain if MX records exist
    const foundEmail = ranked[0] ?? await guessEmailFromDomain(url);

    return {
      email: foundEmail ?? null,
      phone: rankedPhones[0] ?? null,
      builder, isModern, hasViewport,
      isHttps: url.startsWith('https://'),
      language, pageTitle, metaDescription, copyrightYear,
    };
  } catch {
    return empty;
  }
}

export async function scrapeEmailFromWebsite(url: string): Promise<string | null> {
  return (await analyzeWebsite(url)).email;
}
