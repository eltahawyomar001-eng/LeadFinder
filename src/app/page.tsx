'use client';

import { useState, useMemo } from 'react';
import type { Lead, SearchResponse } from '@/types';
import { GERMAN_STATES } from '@/lib/states';
import Header from '@/components/Header';
import SearchForm from '@/components/SearchForm';
import StatsBar from '@/components/StatsBar';
import ResultsTable from '@/components/ResultsTable';
import ExportButton from '@/components/ExportButton';
import { LoaderIcon } from '@/components/icons';

interface ScanProgress {
  current: number;
  total: number;
  stateName: string;
}

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchState, setSearchState] = useState<{ category: string; location: string; radius: number; source: 'google' | 'osm' } | null>(null);
  const [mobileOnly, setMobileOnly] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  const fetchOsmState = async (category: string, stateName: string): Promise<SearchResponse> => {
    const res = await fetch('/api/overpass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, stateName }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Overpass failed'); }
    return res.json();
  };

  const fetchOsmCity = async (category: string, city: string, radius: number): Promise<SearchResponse> => {
    const res = await fetch('/api/overpass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, city, radius }),
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

  // ── all-Germany sequential scan ───────────────────────────────────────────

  const handleAllGermanyScan = async (category: string) => {
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
        const data = await fetchOsmState(category, state.osmName);
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

  const handleSearch = async (category: string, location: string, radius: number, source: 'google' | 'osm') => {
    setSearchState({ category, location, radius, source });

    // All-Germany sequential scan (OSM only)
    if (location === '__ALL__') {
      await handleAllGermanyScan(category);
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
        const data = await fetchOsmState(category, stateName);
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setScanProgress(null);
        setLoading(false);
      }
      return;
    }

    // City-level search (Google or OSM)
    setLoading(true);
    setError(null);
    setResult(null);
    setNextPageToken(undefined);
    try {
      const data = source === 'osm'
        ? await fetchOsmCity(category, location, radius)
        : await fetchGoogle(category, location, radius);
      setResult(data);
      if (source === 'google') setNextPageToken(data.nextPageToken);
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

  // ── derived state ─────────────────────────────────────────────────────────

  const allLeads: Lead[] = result?.leads ?? [];
  const filteredLeads = useMemo(
    () => mobileOnly ? allLeads.filter((l) => l.is_mobile) : allLeads,
    [allLeads, mobileOnly]
  );
  const mobileCount = allLeads.filter((l) => l.is_mobile).length;

  const isGermanyScan = searchState?.location === '__ALL__';

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#020609' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '896px', margin: '0 auto', width: '100%', padding: '20px 16px 40px' }}>
        {/* Hero */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2, marginBottom: '8px' }}>
            Find Leads Across Germany
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, maxWidth: '560px' }}>
            I built this to find local businesses that need a better website and reach them on WhatsApp with a personalized pitch — scored by priority.
          </p>
        </div>

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
                  {searchState?.source === 'osm'
                    ? 'Querying OpenStreetMap + scraping emails...'
                    : 'Fetching businesses, phones + scraping emails...'}
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

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ color: '#475569', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Results — sorted by priority {loading && scanProgress ? `(${scanProgress.current}/${scanProgress.total} states)` : ''}
                </span>
                {/* Mobile filter toggle */}
                <button
                  onClick={() => setMobileOnly(!mobileOnly)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: mobileOnly ? '#052e16' : '#1e293b',
                    border: `1px solid ${mobileOnly ? '#166534' : '#334155'}`,
                    color: mobileOnly ? '#4ade80' : '#94a3b8',
                    borderRadius: '999px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: 'unset',
                  }}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Mobile only ({mobileCount})
                </button>
              </div>
              <ExportButton leads={filteredLeads} />
            </div>

            {filteredLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
                <p style={{ fontSize: '16px', fontWeight: 600 }}>
                  {mobileOnly ? 'No mobile numbers in these results' : 'No businesses found'}
                </p>
                <p style={{ fontSize: '13px', marginTop: '6px' }}>
                  {mobileOnly ? 'Turn off the "Mobile only" filter to see all leads' : 'Try a different category or increase the radius'}
                </p>
              </div>
            ) : (
              <ResultsTable leads={filteredLeads} />
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
            <a href="mailto:omarragehfulda@gmail.com" style={{ fontSize: '11px', color: '#334155', textDecoration: 'none' }}>omarragehfulda@gmail.com</a>
            <a href="https://wa.me/4917655093674" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#334155', textDecoration: 'none' }}>+49 176 55093674</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
