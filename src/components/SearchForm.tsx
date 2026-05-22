'use client';

import { useState } from 'react';
import { GERMAN_CITIES } from '@/lib/cities';
import { GERMAN_STATES } from '@/lib/states';
import { BUSINESS_CATEGORIES } from '@/lib/categories';
import { SearchIcon, LoaderIcon } from './icons';
import type { Source } from '@/types';

// Sources that do NOT support All Germany or By State
const CITY_ONLY_SOURCES: Source[] = [
  'google', 'here', 'yelp', 'foursquare',
  'dasoertliche', 'gelbeseiten', 'eleveneighty', 'multi',
];

interface Props {
  onSearch: (category: string, location: string, radius: number, source: Source) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: Props) {
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState<Source>('osm');
  const [radius, setRadius] = useState(5);

  const isStateOrAll = location === '__ALL__' || location.startsWith('state:');
  const isCityOnlySource = CITY_ONLY_SOURCES.includes(source);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !location) return;
    onSearch(category, location, radius, source);
  };

  const handleSourceChange = (val: Source) => {
    setSource(val);
    // Reset location if it's OSM-only and new source doesn't support it
    if (CITY_ONLY_SOURCES.includes(val) && (location === '__ALL__' || location.startsWith('state:'))) {
      setLocation('');
    }
  };

  const inputBase: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    color: '#f1f5f9',
    borderRadius: '12px',
    padding: '14px 16px',
    fontSize: '16px',
    outline: 'none',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
  };

  const dropdownArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;

  const selectWithArrow: React.CSSProperties = {
    ...inputBase,
    backgroundImage: dropdownArrow,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight: '44px',
  };

  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: '#0d1f35', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Search Filters
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Source select */}
        <div>
          <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
            Data Source
          </label>
          <select
            value={source}
            onChange={(e) => handleSourceChange(e.target.value as Source)}
            style={selectWithArrow}
          >
            <optgroup label="Free — No API Key">
              <option value="osm">OpenStreetMap</option>
              <option value="dasoertliche">Das Örtliche — DE Phone Book</option>
              <option value="gelbeseiten">Gelbe Seiten — DE Yellow Pages</option>
              <option value="eleveneighty">11880.com — DE Directory</option>
            </optgroup>
            <optgroup label="API Key Required (free tiers)">
              <option value="google">Google Places</option>
              <option value="here">HERE Places — 250k/month free</option>
              <option value="yelp">Yelp Fusion — 500/day free</option>
              <option value="foursquare">Foursquare — free tier</option>
            </optgroup>
            <optgroup label="Multi-Source">
              <option value="multi">All Sources — merge everything</option>
            </optgroup>
          </select>
        </div>

        {/* Category */}
        <div>
          <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
            Business Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            style={selectWithArrow}
          >
            <option value="">Select category...</option>
            {BUSINESS_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.query}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
            Location
          </label>
          <div style={{ position: 'relative' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              style={{
                ...inputBase,
                paddingLeft: '40px',
                backgroundImage: dropdownArrow,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: '44px',
              }}
            >
              <option value="">Select location...</option>

              {source === 'osm' && (
                <optgroup label="Whole Germany">
                  <option value="__ALL__">All of Germany — all 16 Bundesländer</option>
                </optgroup>
              )}

              {source === 'osm' && (
                <optgroup label="By State (Bundesland)">
                  {GERMAN_STATES.map((s) => (
                    <option key={s.osmName} value={`state:${s.osmName}`}>{s.name}</option>
                  ))}
                </optgroup>
              )}

              <optgroup label="By City">
                {GERMAN_CITIES.sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                  <option key={c.name} value={c.name}>{c.name} ({c.state})</option>
                ))}
              </optgroup>
            </select>
          </div>

          {location === '__ALL__' && (
            <p style={{ color: '#3b82f6', fontSize: '11px', marginTop: '6px', lineHeight: 1.4 }}>
              Scans all 16 Bundesländer one by one — results appear as each state completes. May take 5–10 min.
            </p>
          )}

          {isCityOnlySource && (
            <p style={{ color: '#64748b', fontSize: '11px', marginTop: '6px', lineHeight: 1.4 }}>
              This source only supports city-level searches.
            </p>
          )}
        </div>

        {/* Radius — hidden for state/whole-Germany queries */}
        {!isStateOrAll && (
          <div>
            <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>
              Radius: <span style={{ color: '#3b82f6', fontWeight: 700 }}>{radius} km</span>
            </label>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ color: '#475569', fontSize: '11px' }}>1 km</span>
              <span style={{ color: '#475569', fontSize: '11px' }}>50 km</span>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !category || !location}
          style={{
            width: '100%',
            backgroundColor: loading || !category || !location ? '#1e293b' : '#2563eb',
            color: loading || !category || !location ? '#475569' : '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: loading || !category || !location ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '4px',
            transition: 'background-color 0.15s',
            minHeight: '52px',
          }}
        >
          {loading ? (
            <>
              <LoaderIcon size={18} />
              {location === '__ALL__' ? 'Scanning Germany...' : 'Searching...'}
            </>
          ) : (
            <>
              <SearchIcon size={18} />
              {location === '__ALL__' ? 'Scan All of Germany' : 'Find Leads'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
