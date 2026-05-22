'use client';

import { useState } from 'react';
import { GERMAN_CITIES } from '@/lib/cities';
import { BUSINESS_CATEGORIES } from '@/lib/categories';
import { SearchIcon, LocationIcon, FilterIcon, LoaderIcon } from './icons';

interface Props {
  onSearch: (category: string, city: string, radius: number) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: Props) {
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [radius, setRadius] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !city) return;
    onSearch(category, city, radius);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <FilterIcon className="text-blue-400" size={18} />
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
          Search Filters
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Business Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">
            Business Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
          >
            <option value="">Select category...</option>
            {BUSINESS_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.query}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">
            City
          </label>
          <div className="relative">
            <LocationIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              size={16}
            />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="">Select city...</option>
              {GERMAN_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Radius */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">
            Radius: <span className="text-blue-400 font-semibold">{radius} km</span>
          </label>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500 mt-2"
          />
          <div className="flex justify-between text-xs text-slate-600">
            <span>1 km</span>
            <span>50 km</span>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !category || !city}
        className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg px-8 py-2.5 text-sm transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <LoaderIcon size={16} />
            Searching...
          </>
        ) : (
          <>
            <SearchIcon size={16} />
            Find Leads
          </>
        )}
      </button>
    </form>
  );
}
