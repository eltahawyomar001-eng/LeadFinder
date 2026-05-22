'use client';

import { useState } from 'react';
import { GERMAN_CITIES } from '@/lib/cities';
import { BUSINESS_CATEGORIES } from '@/lib/categories';
import { SearchIcon, LocationIcon, LoaderIcon } from './icons';

interface Props {
  onSearch: (category: string, city: string, radius: number, source: 'google' | 'osm') => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: Props) {
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [source, setSource] = useState<'google' | 'osm'>('google');
  const [radius, setRadius] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !city) return;
    onSearch(category, city, radius, source);
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

      {/* Source toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {([
          { val: 'google' as const, label: 'Google Places', sub: 'Phone numbers + ratings' },
          { val: 'osm' as const,    label: 'OpenStreetMap', sub: 'Free · no API key' },
        ]).map(({ val, label, sub }) => (
          <button
            key={val}
            type="button"
            onClick={() => setSource(val)}
            style={{
              flex: 1,
              backgroundColor: source === val ? '#1e3a5f' : '#0f172a',
              border: `2px solid ${source === val ? '#3b82f6' : '#1e293b'}`,
              borderRadius: '12px',
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'left' as const,
              minHeight: 'unset',
              display: 'block',
              transition: 'all 0.15s',
            }}
          >
            <p style={{ color: source === val ? '#93c5fd' : '#64748b', fontSize: '13px', fontWeight: 700, margin: 0 }}>{label}</p>
            <p style={{ color: source === val ? '#3b82f6' : '#334155', fontSize: '11px', margin: '2px 0 0' }}>{sub}</p>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Category */}
        <div>
          <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
            Business Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            style={{
              ...inputBase,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              paddingRight: '44px',
            }}
          >
            <option value="">Select category...</option>
            {BUSINESS_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.query}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* City */}
        <div>
          <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
            City
          </label>
          <div style={{ position: 'relative' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              style={{
                ...inputBase,
                paddingLeft: '40px',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: '44px',
              }}
            >
              <option value="">Select city...</option>
              {GERMAN_CITIES.sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                <option key={c.name} value={c.name}>{c.name} ({c.state})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Radius */}
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

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !category || !city}
          style={{
            width: '100%',
            backgroundColor: loading || !category || !city ? '#1e293b' : '#2563eb',
            color: loading || !category || !city ? '#475569' : '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: loading || !category || !city ? 'not-allowed' : 'pointer',
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
              Searching...
            </>
          ) : (
            <>
              <SearchIcon size={18} />
              Find Leads
            </>
          )}
        </button>
      </div>
    </form>
  );
}
