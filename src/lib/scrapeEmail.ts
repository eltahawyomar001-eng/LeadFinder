const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Domains to ignore — generic, not the business owner's inbox
const IGNORE_DOMAINS = new Set([
  'gmail.com', 'gmx.de', 'gmx.net', 'gmx.at', 'gmx.ch',
  'web.de', 'freenet.de', 't-online.de', 'hotmail.com', 'outlook.com',
  'yahoo.com', 'yahoo.de', 'icloud.com', 'me.com',
  'example.com', 'sentry.io', 'w3.org', 'schema.org',
]);

export async function scrapeEmailFromWebsite(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadFinderBot/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(6_000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Prefer mailto: links — most reliable
    const mailtoMatches = [...html.matchAll(/href=["']mailto:([^"'?&\s]+)/gi)]
      .map((m) => m[1].toLowerCase());

    // Also grep raw email addresses from visible text and meta
    const rawMatches = [...html.matchAll(EMAIL_RE)]
      .map((m) => m[0].toLowerCase());

    const candidates = [...new Set([...mailtoMatches, ...rawMatches])];

    const valid = candidates.filter((e) => {
      const domain = e.split('@')[1];
      if (!domain) return false;
      if (IGNORE_DOMAINS.has(domain)) return false;
      // Skip image/asset emails like noreply, support, info@big-provider
      if (/\.(png|jpg|gif|svg|ico|css|js)$/.test(domain)) return false;
      return true;
    });

    // Prefer non-generic prefixes
    const preferred = valid.find((e) => !/^(info|kontakt|contact|hallo|hello|mail|post|office|admin|noreply|no-reply)@/.test(e));
    return preferred ?? valid[0] ?? null;
  } catch {
    return null;
  }
}
