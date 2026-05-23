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
      'Accept-Language': 'de-DE,de;q=0.9',
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

  // Prefer direct owner email over generic inboxes
  const preferred = valid.find((e) => !/^(noreply|no-reply|admin|webmaster|postmaster|donotreply)@/.test(e));
  return preferred ?? valid[0] ?? null;
}

export async function scrapeEmailFromWebsite(url: string): Promise<string | null> {
  try {
    const base = new URL(url);
    const origin = base.origin;

    // Try pages in priority order.
    // German §5 TMG legally requires an email address in the Impressum — best source.
    const pages = [
      url,
      `${origin}/impressum`,
      `${origin}/impressum.html`,
      `${origin}/impressum/`,
      `${origin}/kontakt`,
      `${origin}/kontakt.html`,
      `${origin}/contact`,
      `${origin}/ueber-uns`,
    ];

    for (const page of pages) {
      try {
        const html = await fetchHtml(page);
        const email = extractEmail(html);
        if (email) return email;
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}
