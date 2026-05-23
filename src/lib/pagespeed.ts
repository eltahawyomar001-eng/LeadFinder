export interface PageSpeedResult {
  score: number;      // 0–100 mobile performance score
  loadTime: string;   // e.g. "4.2 s" (LCP)
}

export async function getPageSpeed(url: string): Promise<PageSpeedResult | null> {
  try {
    const key = process.env.PAGESPEED_API_KEY;
    const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    endpoint.searchParams.set('url', url);
    endpoint.searchParams.set('strategy', 'mobile');
    endpoint.searchParams.set('category', 'performance');
    if (key) endpoint.searchParams.set('key', key);

    const res = await fetch(endpoint.toString(), { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;

    const data = await res.json();
    const raw = data?.lighthouseResult?.categories?.performance?.score;
    if (raw == null) return null;

    const score = Math.round(raw * 100);
    const loadTime = (data?.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue ?? '').trim();

    return { score, loadTime };
  } catch {
    return null;
  }
}
