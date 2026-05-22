'use client';

import type { SearchResponse } from '@/types';
import { BuildingIcon, PhoneIcon, AlertIcon } from './icons';

interface Props {
  data: SearchResponse;
}

function Stat({ icon, value, label, accent }: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 flex-1 min-w-0">
      <div className={`${accent} shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function StatsBar({ data }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <Stat
        icon={<BuildingIcon size={22} />}
        value={data.total}
        label="Businesses found"
        accent="text-blue-400"
      />
      <Stat
        icon={<PhoneIcon size={22} />}
        value={data.withPhone}
        label="With phone number"
        accent="text-green-400"
      />
      <Stat
        icon={<AlertIcon size={22} />}
        value={data.highPriority}
        label="High-priority leads"
        accent="text-orange-400"
      />
      <Stat
        icon={
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        }
        value={`${Math.round((data.withPhone / (data.total || 1)) * 100)}%`}
        label="Phone coverage"
        accent="text-purple-400"
      />
    </div>
  );
}
