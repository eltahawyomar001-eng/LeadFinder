'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Lead, SearchResponse, Source, Country } from '@/types';
import { COUNTRY_INFO } from '@/types';
import { GERMAN_STATES } from '@/lib/states';
import Header from '@/components/Header';
import SearchForm from '@/components/SearchForm';
import StatsBar from '@/components/StatsBar';
import ResultsTable from '@/components/ResultsTable';
import ExportButton from '@/components/ExportButton';
import { LoaderIcon } from '@/components/icons';

// ─── Deliverability Banner ────────────────────────────────────────────────────

interface DelivCheck { pass: boolean; record: string | null }
interface DelivResult { domain: string; spf: DelivCheck; dkim: DelivCheck; dmarc: DelivCheck; allPass: boolean }

function DeliverabilityBanner() {
  const [data, setData] = useState<DelivResult | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('deliv_dismissed')) { setDismissed(true); return; }
    fetch('/api/deliverability').then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  if (dismissed || !data || data.allPass) return null;

  const issues = [
    !data.spf.pass  && 'SPF record missing',
    !data.dkim.pass && 'DKIM not configured (Resend selector)',
    !data.dmarc.pass && 'DMARC policy missing',
  ].filter(Boolean) as string[];

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      backgroundColor: 'rgba(120,53,15,0.25)', border: '1px solid #92400e',
      borderRadius: '12px', padding: '14px 16px', marginBottom: '16px',
    }}>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
          Deliverability warning — {data.domain}
        </p>
        <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {issues.map((i) => (
            <li key={i} style={{ color: '#fcd34d', fontSize: '12px' }}>{i}</li>
          ))}
        </ul>
        <p style={{ color: '#92400e', fontSize: '11px', marginTop: '6px' }}>
          Fix DNS records in Namecheap / Resend dashboard before sending cold emails.
        </p>
      </div>
      <button
        onClick={() => { sessionStorage.setItem('deliv_dismissed', '1'); setDismissed(true); }}
        style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', padding: '2px', minHeight: 'unset', flexShrink: 0 }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

interface ScanProgress {
  current: number;
  total: number;
  stateName: string;
}

const SOURCE_LABELS: Record<Source, string> = {
  osm: 'OpenStreetMap',
  google: 'Google Places',
  here: 'HERE Places',
  yelp: 'Yelp Fusion',
  foursquare: 'Foursquare',
  dasoertliche: 'Das Örtliche',
  gelbeseiten: 'Gelbe Seiten',
  eleveneighty: '11880.com',
  multi: 'All Sources',
};

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchState, setSearchState] = useState<{ category: string; location: string; radius: number; source: Source } | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [fEmail, setFEmail] = useState(false);
  const [fPhone, setFPhone] = useState(false);
  const [fWebsite, setFWebsite] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [contactedIds, setContactedIds] = useState(new Set<string>());
  const [activeCountry, setActiveCountry] = useState<Country>('de');

  // ── helpers ──────────────────────────────────────────────────────────────

  const fetchOsmState = async (category: string, stateName: string, country: Country): Promise<SearchResponse> => {
    const res = await fetch('/api/overpass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, stateName, country }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Overpass failed'); }
    return res.json();
  };

  const fetchOsmCity = async (category: string, city: string, radius: number, country: Country): Promise<SearchResponse> => {
    const res = await fetch('/api/overpass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, city, radius, country }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Overpass failed'); }
    return res.json();
  };

  const fetchGoogle = async (category: string, city: string, radius: number, pageToken?: string): Promise<SearchResponse> => {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, city, radius, pageToken }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Search failed'); }
    return res.json();
  };

  const fetchSource = async (
    source: Exclude<Source, 'osm' | 'google'>,
    category: string,
    city: string,
    radius: number,
    country: Country,
  ): Promise<SearchResponse> => {
    const endpointMap: Record<Exclude<Source, 'osm' | 'google'>, string> = {
      here: '/api/here',
      yelp: '/api/yelp',
      foursquare: '/api/foursquare',
      dasoertliche: '/api/dasoertliche',
      gelbeseiten: '/api/gelbeseiten',
      eleveneighty: '/api/eleveneighty',
      multi: '/api/multisearch',
    };
    const endpoint = endpointMap[source];
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, city, radius, country }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? `${SOURCE_LABELS[source]} failed`); }
    return res.json();
  };

  // ── all-Germany sequential scan ───────────────────────────────────────────

  const handleAllGermanyScan = async (category: string, country: Country) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setNextPageToken(undefined);

    const seenIds = new Set<string>();
    let accLeads: Lead[] = [];
    let accPhone = 0;
    let accHighPriority = 0;

    for (let i = 0; i < GERMAN_STATES.length; i++) {
      const state = GERMAN_STATES[i];
      setScanProgress({ current: i + 1, total: GERMAN_STATES.length, stateName: state.name });

      try {
        const data = await fetchOsmState(category, state.osmName, country);
        const newLeads = data.leads.filter((l) => {
          if (seenIds.has(l.place_id)) return false;
          seenIds.add(l.place_id);
          return true;
        });
        accLeads = [...accLeads, ...newLeads];
        accPhone += newLeads.filter((l) => l.phone !== null).length;
        accHighPriority += newLeads.filter((l) => l.weakness_score >= 6).length;

        // Sort and update results after each state so user sees progress
        const sorted = [...accLeads].sort((a, b) => b.weakness_score - a.weakness_score);
        setResult({ leads: sorted, total: sorted.length, withPhone: accPhone, highPriority: accHighPriority });
      } catch {
        // Skip failed state and continue
      }
    }

    setScanProgress(null);
    setLoading(false);
  };

  // ── main search handler ───────────────────────────────────────────────────

  const handleSearch = async (category: string, location: string, radius: number, source: Source, country: Country) => {
    setActiveCountry(country);
    setSearchState({ category, location, radius, source });

    // All-Germany sequential scan (OSM only)
    if (location === '__ALL__') {
      await handleAllGermanyScan(category, country);
      return;
    }

    // Single-state scan (OSM only)
    if (location.startsWith('state:')) {
      const stateName = location.slice(6);
      setLoading(true);
      setError(null);
      setResult(null);
      setNextPageToken(undefined);
      setScanProgress({ current: 1, total: 1, stateName });
      try {
        const data = await fetchOsmState(category, stateName, country);
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setScanProgress(null);
        setLoading(false);
      }
      return;
    }

    // City-level search
    setLoading(true);
    setError(null);
    setResult(null);
    setNextPageToken(undefined);

    try {
      let data: SearchResponse;
      if (source === 'osm') {
        data = await fetchOsmCity(category, location, radius, country);
      } else if (source === 'google') {
        data = await fetchGoogle(category, location, radius);
        setNextPageToken(data.nextPageToken);
      } else {
        data = await fetchSource(source, category, location, radius, country);
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextPageToken || !searchState || searchState.source !== 'google') return;
    setLoadingMore(true);
    try {
      const data = await fetchGoogle(searchState.category, searchState.location, searchState.radius, nextPageToken);
      setResult((prev) => prev ? {
        ...data,
        leads: [...prev.leads, ...data.leads],
        total: prev.total + data.total,
        withPhone: prev.withPhone + data.withPhone,
        highPriority: prev.highPriority + data.highPriority,
      } : data);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleContacted = (placeId: string) => {
    setContactedIds((prev) => new Set([...prev, placeId]));
  };

  // Auto-mark leads already in CRM whenever results change
  useEffect(() => {
    if (!result?.leads?.length) return;
    const placeIds = result.leads.map((l) => l.place_id).filter(Boolean);
    fetch('/api/leads/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeIds }),
    })
      .then((r) => r.json())
      .then(({ existing }: { existing: string[] }) => {
        if (existing?.length) {
          setContactedIds((prev) => {
            const next = new Set(prev);
            existing.forEach((id) => next.add(id));
            return next;
          });
        }
      })
      .catch(() => {});
  }, [result]);

  // Patch a lead's email when scraped on-demand from LeadCard
  const handleEmailFound = (placeId: string, email: string) => {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        leads: prev.leads.map((l) => l.place_id === placeId ? { ...l, email } : l),
      };
    });
  };

  // ── derived state ─────────────────────────────────────────────────────────

  const allLeads: Lead[] = result?.leads ?? [];
  const filteredLeads = useMemo(() => {
    let leads = allLeads.filter((l) => l.business_status !== 'CLOSED_PERMANENTLY');
    if (minScore > 0) leads = leads.filter((l) => l.weakness_score >= minScore);
    if (fEmail)   leads = leads.filter((l) => !!l.email);
    if (fPhone)   leads = leads.filter((l) => !!l.phone);
    if (fWebsite) leads = leads.filter((l) => !!l.website);
    return leads;
  }, [allLeads, minScore, fEmail, fPhone, fWebsite]);
  const emailCount   = allLeads.filter((l) => !!l.email).length;
  const phoneCount   = allLeads.filter((l) => !!l.phone).length;
  const websiteCount = allLeads.filter((l) => !!l.website).length;

  const isGermanyScan = searchState?.location === '__ALL__';

  const loadingMessage = (() => {
    if (!searchState) return 'Searching...';
    const label = SOURCE_LABELS[searchState.source] ?? searchState.source;
    if (searchState.source === 'multi') return `Querying all sources in parallel + scraping emails...`;
    if (searchState.source === 'osm') return 'Querying OpenStreetMap + scraping emails...';
    if (['dasoertliche', 'gelbeseiten', 'eleveneighty'].includes(searchState.source)) {
      return `Scraping ${label}...`;
    }
    return `Fetching from ${label} + scraping emails...`;
  })();

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#020609' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '896px', margin: '0 auto', width: '100%', padding: '20px 16px 40px' }}>
        {/* Hero */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2, marginBottom: '8px' }}>
            Find Business Leads Worldwide
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, maxWidth: '560px' }}>
            Discover businesses with weak online presence in any country. Scrapes emails, scores website quality, and generates personalized cold outreach in German, English, or Arabic — matched to the company&apos;s own language.
          </p>
        </div>

        <DeliverabilityBanner />

        {/* Search */}
        <div style={{ marginBottom: '24px' }}>
          <SearchForm onSearch={handleSearch} loading={loading} />
        </div>

        {/* Loading / scan progress */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 0' }}>
            <LoaderIcon size={32} className="text-blue-400" />

            {isGermanyScan && scanProgress ? (
              <>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#93c5fd' }}>
                  Scanning {scanProgress.stateName}...
                </p>

                {/* Progress bar */}
                <div style={{ width: '100%', maxWidth: '400px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>
                      {scanProgress.current} / {scanProgress.total} Bundesländer
                    </span>
                    {result && (
                      <span style={{ color: '#34d399', fontSize: '12px', fontWeight: 600 }}>
                        {result.total} leads found
                      </span>
                    )}
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(scanProgress.current / scanProgress.total) * 100}%`,
                      backgroundColor: '#3b82f6',
                      borderRadius: '999px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                    {GERMAN_STATES.map((s, idx) => (
                      <span key={s.osmName} style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '999px',
                        backgroundColor: idx < scanProgress.current - 1 ? '#052e16' : idx === scanProgress.current - 1 ? '#1e3a5f' : '#0f172a',
                        border: `1px solid ${idx < scanProgress.current - 1 ? '#166534' : idx === scanProgress.current - 1 ? '#3b82f6' : '#1e293b'}`,
                        color: idx < scanProgress.current - 1 ? '#4ade80' : idx === scanProgress.current - 1 ? '#93c5fd' : '#334155',
                      }}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#334155' }}>Results appear as each state completes</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '14px', color: '#64748b' }}>
                  {loadingMessage}
                </p>
                <p style={{ fontSize: '12px', color: '#334155' }}>Takes 15–30 seconds</p>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', gap: '12px', backgroundColor: 'rgba(127,29,29,0.3)', border: '1px solid #7f1d1d', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#fca5a5' }}>Search failed</p>
              <p style={{ fontSize: '13px', color: '#f87171', marginTop: '4px' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && result.total > 0 && (
          <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <StatsBar data={result} />

            {/* Filter bar */}
            <div style={{ backgroundColor: '#06101f', border: '1px solid #0f1f36', borderRadius: '14px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Row 1: score thresholds + export */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#334155', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: '4px' }}>
                    Min score
                  </span>
                  {([0, 3, 5, 7] as const).map((s) => (
                    <button key={s} onClick={() => setMinScore(s)} style={{
                      backgroundColor: minScore === s ? '#1e3a5f' : 'transparent',
                      border: `1px solid ${minScore === s ? '#3b82f6' : '#1e293b'}`,
                      color: minScore === s ? '#93c5fd' : '#475569',
                      borderRadius: '999px', padding: '3px 10px',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer', minHeight: 'unset',
                    }}>
                      {s === 0 ? 'All' : `${s}+`}
                    </button>
                  ))}
                  <span style={{ color: '#1e293b', fontSize: '12px', marginLeft: '4px' }}>|</span>
                  <span style={{ color: '#334155', fontSize: '11px', fontWeight: 600 }}>
                    {loading && scanProgress ? `${scanProgress.current}/${scanProgress.total} states scanned` : `${filteredLeads.length} of ${allLeads.length} shown`}
                  </span>
                </div>
                <ExportButton leads={filteredLeads} />
              </div>

              {/* Row 2: contact / website quick filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ color: '#334155', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: '4px' }}>
                  Show only
                </span>
                {[
                  { label: `Email (${emailCount})`, active: fEmail, toggle: () => setFEmail(!fEmail),
                    icon: <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
                  { label: `Phone (${phoneCount})`, active: fPhone, toggle: () => setFPhone(!fPhone),
                    icon: <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg> },
                  { label: `Website (${websiteCount})`, active: fWebsite, toggle: () => setFWebsite(!fWebsite),
                    icon: <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg> },
                ].map(({ label, active, toggle, icon }) => (
                  <button key={label} onClick={toggle} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    backgroundColor: active ? '#052e16' : 'transparent',
                    border: `1px solid ${active ? '#166534' : '#1e293b'}`,
                    color: active ? '#4ade80' : '#475569',
                    borderRadius: '999px', padding: '3px 10px',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer', minHeight: 'unset',
                  }}>
                    {icon}{label}
                  </button>
                ))}
                {(minScore > 0 || fEmail || fPhone || fWebsite) && (
                  <button onClick={() => { setMinScore(0); setFEmail(false); setFPhone(false); setFWebsite(false); }} style={{
                    background: 'none', border: 'none', color: '#475569', fontSize: '11px',
                    cursor: 'pointer', minHeight: 'unset', textDecoration: 'underline', padding: '3px 6px',
                  }}>
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {filteredLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
                <p style={{ fontSize: '16px', fontWeight: 600 }}>No leads match these filters</p>
                <p style={{ fontSize: '13px', marginTop: '6px' }}>
                  Try lowering the minimum score or removing a filter
                </p>
              </div>
            ) : (
              <ResultsTable leads={filteredLeads} onEmailFound={handleEmailFound} contactedIds={contactedIds} onContacted={handleContacted} />
            )}

            {nextPageToken && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', paddingTop: '8px' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f1f5f9',
                    borderRadius: '12px',
                    padding: '14px 32px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                    opacity: loadingMore ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  {loadingMore ? <><LoaderIcon size={16} /> Loading next 20...</> : 'Load next 20 results'}
                </button>
                <p style={{ fontSize: '11px', color: '#334155' }}>Google Places returns 20 per page — max 60 per search</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid #1e293b', padding: '16px', marginTop: 'auto' }}>
        <div style={{ maxWidth: '896px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', color: '#334155', textAlign: 'center' }}>
            Built by{' '}
            <a href="https://omar-portfolio.xyz" target="_blank" rel="noopener noreferrer" style={{ color: '#475569' }}>Omar Rageh</a>
            {' '}· Full-Stack Developer · Fulda, Germany
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="mailto:omar@omarrageh.de" style={{ fontSize: '11px', color: '#334155', textDecoration: 'none' }}>omar@omarrageh.de</a>
            <a href="https://wa.me/4917655093674" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#334155', textDecoration: 'none' }}>+49 176 55093674</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
