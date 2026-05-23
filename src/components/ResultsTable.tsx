'use client';

import { useState } from 'react';
import type { Lead } from '@/types';
import LeadCard from './LeadCard';
import MessageModal from './MessageModal';

interface Props {
  leads: Lead[];
  onEmailFound?: (placeId: string, email: string) => void;
}

const PRIORITY: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  high:   { label: 'High Priority', bg: '#450a0a', border: '#7f1d1d', text: '#fca5a5', dot: '#ef4444' },
  medium: { label: 'Medium',        bg: '#431407', border: '#7c2d12', text: '#fdba74', dot: '#f97316' },
  low:    { label: 'Low',           bg: '#0c1a2e', border: '#1e3a5f', text: '#93c5fd', dot: '#3b82f6' },
};

function priorityKey(score: number) {
  return score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';
}

// Inline scrape button for table rows
function ScrapeBtn({ lead, onEmailFound }: { lead: Lead; onEmailFound?: (id: string, email: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [tried, setTried] = useState(false);

  const handleScrape = async () => {
    if (!lead.website || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/scrape-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: lead.website }),
      });
      const { email } = await res.json();
      if (email && onEmailFound) onEmailFound(lead.place_id, email);
    } finally {
      setLoading(false);
      setTried(true);
    }
  };

  if (tried && !lead.email) {
    return <span style={{ color: '#4a3030', fontSize: '12px' }}>not found</span>;
  }

  return (
    <button
      onClick={handleScrape}
      disabled={loading}
      title="Search website + Impressum for email"
      style={{
        backgroundColor: 'transparent',
        border: '1px solid #334155',
        color: '#475569',
        borderRadius: '6px',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? (
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
      ) : (
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )}
      {loading ? 'Searching...' : 'Find'}
    </button>
  );
}

export default function ResultsTable({ leads, onEmailFound }: Props) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  if (leads.length === 0) return null;

  return (
    <>
      {/* ── Mobile: stacked cards ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="md:hidden">
        {leads.map((lead, i) => (
          <LeadCard key={lead.place_id} lead={lead} index={i} onViewMessage={setActiveLead} onEmailFound={onEmailFound} />
        ))}
      </div>

      {/* ── Desktop: table ────────────────────────────────────────────────── */}
      <div className="hidden md:block" style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #1e293b' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '820px' }}>
          <colgroup>
            <col style={{ width: '42px' }} />
            <col style={{ width: '200px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '190px' }} />
            <col style={{ width: '60px' }} />
            <col style={{ width: '50px' }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: '#0d1628', borderBottom: '1px solid #1e293b' }}>
              {['#', 'Business', 'Priority', 'Phone', 'Website', 'Email', 'Status', ''].map((h) => (
                <th key={h} style={{
                  textAlign: 'left', padding: '10px 14px',
                  fontSize: '11px', fontWeight: 700, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => {
              const pk = priorityKey(lead.weakness_score);
              const pc = PRIORITY[pk];
              const isEven = i % 2 === 0;
              const mailtoHref = `mailto:${lead.email ?? ''}?subject=${encodeURIComponent(lead.email_subject ?? '')}&body=${encodeURIComponent(lead.email_body ?? '')}`;

              return (
                <tr key={lead.place_id} style={{ backgroundColor: isEven ? '#020609' : '#050d1a', borderBottom: '1px solid #0f1f36' }}>

                  {/* # */}
                  <td style={{ padding: '11px 14px', color: '#334155', fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {i + 1}
                  </td>

                  {/* Business */}
                  <td style={{ padding: '11px 14px' }}>
                    <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                      {lead.name}
                    </p>
                    <p style={{ color: '#475569', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>
                      {lead.formatted_address}
                    </p>
                  </td>

                  {/* Priority */}
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      backgroundColor: pc.bg, border: `1px solid ${pc.border}`, color: pc.text,
                      borderRadius: '999px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: pc.dot, flexShrink: 0 }} />
                      {pc.label}
                    </span>
                  </td>

                  {/* Phone */}
                  <td style={{ padding: '11px 14px' }}>
                    {lead.phone
                      ? <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{lead.phone}</span>
                      : <span style={{ color: '#334155', fontSize: '13px' }}>—</span>
                    }
                  </td>

                  {/* Website */}
                  <td style={{ padding: '11px 14px' }}>
                    {lead.website
                      ? <a href={lead.website} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#60a5fa', fontSize: '13px', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {new URL(lead.website).hostname.replace('www.', '')}
                        </a>
                      : <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>No website</span>
                    }
                  </td>

                  {/* Email */}
                  <td style={{ padding: '11px 14px' }}>
                    {lead.email ? (
                      <a href={mailtoHref}
                        title="Open in email client"
                        style={{ color: '#34d399', fontSize: '12px', fontFamily: 'monospace', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {lead.email}
                      </a>
                    ) : lead.website ? (
                      <ScrapeBtn lead={lead} onEmailFound={onEmailFound} />
                    ) : (
                      <span style={{ color: '#334155', fontSize: '13px' }}>—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: 600,
                      color: lead.business_status === 'OPERATIONAL' ? '#34d399' : lead.business_status === 'CLOSED_PERMANENTLY' ? '#f87171' : '#fb923c',
                    }}>
                      {lead.business_status === 'OPERATIONAL' ? 'Open' : lead.business_status === 'CLOSED_PERMANENTLY' ? 'Closed' : 'Temp.'}
                    </span>
                  </td>

                  {/* Pitch */}
                  <td style={{ padding: '11px 14px' }}>
                    <button
                      onClick={() => setActiveLead(lead)}
                      title="View email pitch"
                      style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#60a5fa', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeLead && <MessageModal lead={activeLead} onClose={() => setActiveLead(null)} />}
    </>
  );
}
