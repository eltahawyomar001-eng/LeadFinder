'use client';

import type { SearchResponse } from '@/types';

interface Stat {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}

export default function StatsBar({ data }: { data: SearchResponse }) {
  const emailCount = data.leads?.filter((l) => !!l.email).length ?? 0;
  const noWebsite = data.leads?.filter((l) => !l.website).length ?? 0;

  const stats: Stat[] = [
    {
      label: 'Found',
      value: data.total.toLocaleString(),
      color: '#93c5fd',
      bg: '#0c1a2e',
      border: '#1e3a5f',
      icon: (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ),
    },
    {
      label: 'High Priority',
      value: data.highPriority.toLocaleString(),
      color: '#fca5a5',
      bg: '#450a0a',
      border: '#7f1d1d',
      icon: (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
    },
    {
      label: 'With Email',
      value: emailCount.toLocaleString(),
      color: '#4ade80',
      bg: '#052e16',
      border: '#166534',
      icon: (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
    },
    {
      label: 'With Phone',
      value: data.withPhone.toLocaleString(),
      color: '#a78bfa',
      bg: '#12082a',
      border: '#4c1d95',
      icon: (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
        </svg>
      ),
    },
    {
      label: 'No Website',
      value: noWebsite.toLocaleString(),
      color: '#fb923c',
      bg: '#431407',
      border: '#7c2d12',
      icon: (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
      ),
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          backgroundColor: '#06101f',
          border: `1px solid #0f1f36`,
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: '32px', height: '32px',
            backgroundColor: s.bg, border: `1px solid ${s.border}`,
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: s.color, flexShrink: 0,
          }}>
            {s.icon}
          </div>
          <div>
            <p style={{ color: '#334155', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
              {s.label}
            </p>
            <p style={{ color: s.color, fontSize: '20px', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {s.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
