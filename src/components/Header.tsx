'use client';

import { GermanyMapIcon } from './icons';

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-blue-400">
            <GermanyMapIcon size={36} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              LeadFinder<span className="text-blue-400">.de</span>
            </h1>
            <p className="text-xs text-slate-500 leading-none mt-0.5">
              Local business leads across Germany
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 border border-slate-700 rounded px-2 py-1">
            Powered by Google Places API
          </span>
        </div>
      </div>
    </header>
  );
}
