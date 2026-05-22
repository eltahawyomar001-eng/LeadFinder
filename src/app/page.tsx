'use client';

import { useState, useMemo } from 'react';
import type { Lead, SearchResponse } from '@/types';
import Header from '@/components/Header';
import SearchForm from '@/components/SearchForm';
import StatsBar from '@/components/StatsBar';
import ResultsTable from '@/components/ResultsTable';
import ExportButton from '@/components/ExportButton';
import { LoaderIcon } from '@/components/icons';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchState, setSearchState] = useState<{ category: string; city: string; radius: number } | null>(null);
  const [mobileOnly, setMobileOnly] = useState(false);

  const fetchLeads = async (category: string, city: string, radius: number, pageToken?: string) => {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, city, radius, pageToken }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Search failed'); }
    return res.json() as Promise<SearchResponse>;
  };

  const handleSearch = async (category: string, city: string, radius: number) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setNextPageToken(undefined);
    setSearchState({ category, city, radius });
    try {
      const data = await fetchLeads(category, city, radius);
      setResult(data);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextPageToken || !searchState) return;
    setLoadingMore(true);
    try {
      const data = await fetchLeads(searchState.category, searchState.city, searchState.radius, nextPageToken);
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

  const allLeads: Lead[] = result?.leads ?? [];
  const filteredLeads = useMemo(
    () => mobileOnly ? allLeads.filter((l) => l.is_mobile) : allLeads,
    [allLeads, mobileOnly]
  );
  const mobileCount = allLeads.filter((l) => l.is_mobile).length;

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

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 0', color: '#64748b' }}>
            <LoaderIcon size={32} className="text-blue-400" />
            <p style={{ fontSize: '14px' }}>Fetching businesses and phone numbers...</p>
            <p style={{ fontSize: '12px', color: '#334155' }}>Takes 10–20 seconds</p>
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
        {result && !loading && (
          <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <StatsBar data={result} />

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ color: '#475569', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Results — sorted by priority
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

            {nextPageToken && (
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
