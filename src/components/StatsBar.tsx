'use client';

import type { SearchResponse } from '@/types';

interface StatProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent: string;
}

function Stat({ icon, value, label, accent }: StatProps) {
  return (
    <div style={{
      backgroundColor: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: '14px',
      padding: '16px',
      flex: '1 1 calc(50% - 6px)',
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div style={{ color: accent, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </p>
        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </p>
      </div>
    </div>
  );
}

export default function StatsBar({ data }: { data: SearchResponse }) {
  const coverage = Math.round((data.withPhone / (data.total || 1)) * 100);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
      <Stat
        icon={<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" /></svg>}
        value={data.total}
        label="Businesses found"
        accent="#60a5fa"
      />
      <Stat
        icon={<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" /></svg>}
        value={data.withPhone}
        label="With phone number"
        accent="#34d399"
      />
      <Stat
        icon={<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
        value={data.highPriority}
        label="High-priority leads"
        accent="#fb923c"
      />
      <Stat
        icon={<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
        value={`${coverage}%`}
        label="Phone coverage"
        accent="#a78bfa"
      />
    </div>
  );
}
