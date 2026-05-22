'use client';

import { useState } from 'react';
import type { Lead, SearchResponse } from '@/types';
import Header from '@/components/Header';
import SearchForm from '@/components/SearchForm';
import StatsBar from '@/components/StatsBar';
import ResultsTable from '@/components/ResultsTable';
import ExportButton from '@/components/ExportButton';
import { AlertIcon, LoaderIcon } from '@/components/icons';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchState, setSearchState] = useState<{ category: string; city: string; radius: number } | null>(null);

  const fetchLeads = async (
    category: string,
    city: string,
    radius: number,
    pageToken?: string
  ) => {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, city, radius, pageToken }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Search failed');
    }

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
      const data = await fetchLeads(
        searchState.category,
        searchState.city,
        searchState.radius,
        nextPageToken
      );
      setResult((prev) =>
        prev
          ? {
              ...data,
              leads: [...prev.leads, ...data.leads],
              total: prev.total + data.total,
              withPhone: prev.withPhone + data.withPhone,
              highPriority: prev.highPriority + data.highPriority,
            }
          : data
      );
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  const allLeads: Lead[] = result?.leads ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-6">
        {/* Hero */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Find Leads Across Germany
          </h2>
          <p className="text-slate-500 text-sm max-w-2xl">
            I built this tool to find local businesses that need a better website — and reach them directly on WhatsApp with a personalized message from me.
            Each lead is scored by how urgently they need help: no website, few reviews, or a low rating.
          </p>
        </div>

        {/* Search */}
        <SearchForm onSearch={handleSearch} loading={loading} />

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
            <LoaderIcon size={32} className="text-blue-400" />
            <p className="text-sm">Searching Google Places and fetching phone numbers...</p>
            <p className="text-xs text-slate-600">This may take 10-20 seconds</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-300">
            <AlertIcon size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Search failed</p>
              <p className="text-xs mt-1 text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="flex flex-col gap-5 fade-in-up">
            <StatsBar data={result} />

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
                Results — sorted by priority
              </h3>
              <ExportButton leads={allLeads} />
            </div>

            {allLeads.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <p className="text-lg">No businesses found</p>
                <p className="text-sm mt-1">Try a different category or increase the radius</p>
              </div>
            ) : (
              <ResultsTable leads={allLeads} />
            )}

            {nextPageToken && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <>
                      <LoaderIcon size={16} />
                      Loading more...
                    </>
                  ) : (
                    'Load more results'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/60 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-700">
            Built by{' '}
            <a href="https://omar-portfolio.xyz" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors">
              Omar Rageh
            </a>
            {' '}· Full-Stack Developer &amp; Automation Builder · Fulda, Germany
          </p>
          <div className="flex items-center gap-4">
            <a href="mailto:omarragehfulda@gmail.com" className="text-xs text-slate-700 hover:text-slate-400 transition-colors">
              omarragehfulda@gmail.com
            </a>
            <a href="https://wa.me/4917655093674" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-700 hover:text-[#25D366] transition-colors">
              +49 176 55093674
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
