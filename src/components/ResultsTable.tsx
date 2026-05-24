'use client';

import { useState, useMemo } from 'react';
import type { Lead } from '@/types';
import LeadCard from './LeadCard';
import MessageModal from './MessageModal';

// ─── Preview Drawer ───────────────────────────────────────────────────────────

function PreviewDrawer({
  lead,
  onClose,
  onSent,
}: {
  lead: Lead;
  onClose: () => void;
  onSent: (placeId: string) => void;
}) {
  const [subject, setSubject] = useState(lead.email_subject ?? '');
  const [body, setBody] = useState(lead.email_body ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: { ...lead, email_subject: subject, email_body: body } }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Send failed');
      }
      onSent(lead.place_id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        zIndex: 200, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#040d1a', borderLeft: '1px solid #1e293b',
          width: '100%', maxWidth: '540px', height: '100dvh',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          position: 'sticky', top: 0, backgroundColor: '#040d1a', zIndex: 10,
        }}>
          <div>
            <p style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: 800, marginBottom: '2px' }}>
              Preview email
            </p>
            <p style={{ color: '#475569', fontSize: '12px' }}>
              To: <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{lead.email}</span>
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#0a1628', border: '1px solid #1e293b', color: '#475569',
            borderRadius: '8px', padding: '8px', cursor: 'pointer', minHeight: 'unset',
            display: 'flex', alignItems: 'center',
          }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Subject</p>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{
                width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b',
                borderRadius: '8px', padding: '10px 12px', color: '#f1f5f9',
                fontSize: '13px', boxSizing: 'border-box' as const,
              }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Body</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{
                flex: 1, minHeight: '320px', width: '100%',
                backgroundColor: '#0a1628', border: '1px solid #1e293b',
                borderRadius: '8px', padding: '10px 12px', color: '#e2e8f0',
                fontSize: '13px', lineHeight: 1.65, resize: 'vertical',
                boxSizing: 'border-box' as const,
              }}
            />
          </div>
          {error && (
            <p style={{ color: '#f87171', fontSize: '12px', fontWeight: 600 }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #1e293b',
          display: 'flex', gap: '10px',
          position: 'sticky', bottom: 0, backgroundColor: '#040d1a',
        }}>
          <button onClick={onClose} style={{
            flex: 1, backgroundColor: 'transparent', border: '1px solid #1e293b',
            color: '#475569', borderRadius: '8px', padding: '11px',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', minHeight: 'unset',
          }}>
            Cancel
          </button>
          <button
            onClick={send}
            disabled={sending || !subject.trim() || !body.trim()}
            style={{
              flex: 2,
              backgroundColor: sending ? '#0a1628' : '#1e3a5f',
              border: `1px solid ${sending ? '#1e293b' : '#3b82f6'}`,
              color: sending ? '#334155' : '#93c5fd',
              borderRadius: '8px', padding: '11px',
              fontSize: '13px', fontWeight: 700,
              cursor: sending ? 'not-allowed' : 'pointer', minHeight: 'unset',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            {sending
              ? <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
              : <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            }
            {sending ? 'Sending…' : 'Confirm & Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  leads: Lead[];
  onEmailFound?: (placeId: string, email: string) => void;
  contactedIds?: Set<string>;
  onContacted?: (placeId: string) => void;
}

type SortKey = 'score' | 'name' | 'email';
type SortDir = 'asc' | 'desc';

const PRIORITY: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  high:   { label: 'High',   bg: '#450a0a', border: '#7f1d1d', text: '#fca5a5', dot: '#ef4444' },
  medium: { label: 'Medium', bg: '#431407', border: '#7c2d12', text: '#fdba74', dot: '#f97316' },
  low:    { label: 'Low',    bg: '#0c1a2e', border: '#1e3a5f', text: '#93c5fd', dot: '#3b82f6' },
};

function priorityKey(score: number) {
  return score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min((score / 10) * 100, 100);
  const color = score >= 7 ? '#ef4444' : score >= 4 ? '#f97316' : '#22c55e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '40px', height: '4px', backgroundColor: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '999px' }} />
      </div>
      <span style={{ color, fontSize: '11px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{score}</span>
    </div>
  );
}

// Inline send button — opens PreviewDrawer instead of sending directly
function SendBtn({ lead, contacted, onPreview }: { lead: Lead; contacted?: boolean; onPreview: () => void }) {
  if (contacted) {
    return (
      <a href="/crm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}>
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        In CRM
      </a>
    );
  }

  return (
    <button
      onClick={() => { if (lead.email) onPreview(); }}
      title="Preview & send"
      style={{
        backgroundColor: 'rgba(21,128,61,0.15)',
        border: '1px solid #166534',
        color: '#4ade80',
        borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', minHeight: 'unset',
      }}
    >
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
      Send
    </button>
  );
}

// Inline scrape button
function ScrapeBtn({ lead, onEmailFound }: { lead: Lead; onEmailFound?: (id: string, email: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [tried, setTried] = useState(false);

  if (tried && !lead.email) {
    return <span style={{ color: '#334155', fontSize: '11px' }}>not found</span>;
  }

  return (
    <button
      onClick={async () => {
        if (!lead.website || loading) return;
        setLoading(true);
        try {
          const res = await fetch('/api/scrape-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ website: lead.website }),
          });
          const data = await res.json();
          if (data.email && onEmailFound) onEmailFound(lead.place_id, data.email);
        } finally {
          setLoading(false);
          setTried(true);
        }
      }}
      disabled={loading}
      style={{
        backgroundColor: 'transparent', border: '1px solid #1e293b', color: '#475569',
        borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', minHeight: 'unset',
      }}
    >
      {loading
        ? <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
        : <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      }
      {loading ? '…' : 'Find'}
    </button>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={active ? '#93c5fd' : '#334155'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'asc' || !active
        ? <><polyline points="18 15 12 9 6 15"/></>
        : <><polyline points="6 9 12 15 18 9"/></>
      }
    </svg>
  );
}

export default function ResultsTable({ leads, onEmailFound, contactedIds, onContacted }: Props) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = useMemo(() => {
    return [...leads].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'score') diff = a.weakness_score - b.weakness_score;
      else if (sortKey === 'name') diff = a.name.localeCompare(b.name);
      else if (sortKey === 'email') diff = (a.email ? 0 : 1) - (b.email ? 0 : 1);
      return sortDir === 'desc' ? -diff : diff;
    });
  }, [leads, sortKey, sortDir]);

  if (leads.length === 0) return null;

  return (
    <>
      {/* ── Mobile: stacked cards ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="md:hidden">
        {leads.map((lead, i) => (
          <LeadCard
            key={lead.place_id} lead={lead} index={i}
            onViewMessage={setActiveLead} onEmailFound={onEmailFound}
            contacted={contactedIds?.has(lead.place_id)} onContacted={onContacted}
            onPreview={(l) => setPreviewLead(l)}
          />
        ))}
      </div>

      {/* ── Desktop: table ────────────────────────────────────────────────── */}
      <div className="hidden md:block" style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid #0f1f36', backgroundColor: '#06101f' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '860px' }}>
          <colgroup>
            <col style={{ width: '36px' }} />
            <col style={{ width: '220px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '200px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: '#040d1a', borderBottom: '1px solid #0a1628' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#334155', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>#</th>
              <th
                onClick={() => toggleSort('name')}
                style={{ padding: '10px 14px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: sortKey === 'name' ? '#93c5fd' : '#334155', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Business <SortIcon active={sortKey === 'name'} dir={sortDir} />
                </span>
              </th>
              <th
                onClick={() => toggleSort('score')}
                style={{ padding: '10px 14px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: sortKey === 'score' ? '#93c5fd' : '#334155', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Score <SortIcon active={sortKey === 'score'} dir={sortDir} />
                </span>
              </th>
              {['Phone', 'Website', 'Email', 'Status', ''].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#334155', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead, i) => {
              const pk = priorityKey(lead.weakness_score);
              const pc = PRIORITY[pk];
              const contacted = contactedIds?.has(lead.place_id);
              const isOpen = lead.business_status === 'OPERATIONAL';
              const isClosed = lead.business_status === 'CLOSED_PERMANENTLY';

              return (
                <tr
                  key={lead.place_id}
                  style={{ borderBottom: '1px solid #0a1628', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#07111f')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* # */}
                  <td style={{ padding: '11px 14px', color: '#1e293b', fontSize: '11px', fontFamily: 'monospace' }}>
                    {i + 1}
                  </td>

                  {/* Business */}
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                        backgroundColor: pc.dot,
                      }} />
                      <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                        {lead.name}
                      </p>
                    </div>
                    <p style={{ color: '#334155', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 0 0 12px', lineHeight: 1.4 }}>
                      {lead.formatted_address}
                    </p>
                  </td>

                  {/* Score */}
                  <td style={{ padding: '11px 14px' }}>
                    <ScoreBar score={lead.weakness_score} />
                    <span style={{
                      display: 'inline-block', marginTop: '4px',
                      backgroundColor: pc.bg, border: `1px solid ${pc.border}`, color: pc.text,
                      borderRadius: '999px', padding: '1px 7px', fontSize: '9px', fontWeight: 700,
                    }}>
                      {pc.label}
                    </span>
                  </td>

                  {/* Phone */}
                  <td style={{ padding: '11px 14px' }}>
                    {lead.phone
                      ? <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{lead.phone}</span>
                      : <span style={{ color: '#1e293b', fontSize: '13px' }}>—</span>
                    }
                  </td>

                  {/* Website */}
                  <td style={{ padding: '11px 14px' }}>
                    {lead.website
                      ? (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#60a5fa', fontSize: '12px', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          {new URL(lead.website).hostname.replace('www.', '')}
                          <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                        </a>
                      )
                      : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>
                          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                          </svg>
                          No site
                        </span>
                      )
                    }
                  </td>

                  {/* Email */}
                  <td style={{ padding: '11px 14px' }}>
                    {lead.email ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#34d399', fontSize: '11px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px', display: 'block' }}>
                          {lead.email}
                        </span>
                        <SendBtn lead={lead} contacted={contacted} onPreview={() => setPreviewLead(lead)} />
                      </div>
                    ) : lead.website ? (
                      <ScrapeBtn lead={lead} onEmailFound={onEmailFound} />
                    ) : (
                      <span style={{ color: '#1e293b', fontSize: '13px' }}>—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '3px',
                      fontSize: '11px', fontWeight: 700,
                      color: isOpen ? '#4ade80' : isClosed ? '#f87171' : '#fb923c',
                    }}>
                      <span style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        backgroundColor: isOpen ? '#4ade80' : isClosed ? '#f87171' : '#fb923c',
                        flexShrink: 0,
                      }} />
                      {isOpen ? 'Open' : isClosed ? 'Closed' : 'Temp.'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '11px 14px' }}>
                    <button
                      onClick={() => setActiveLead(lead)}
                      title="View & copy email pitch"
                      style={{
                        width: '30px', height: '30px', borderRadius: '8px',
                        backgroundColor: '#0a1628', border: '1px solid #1e293b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#475569', cursor: 'pointer', flexShrink: 0, minHeight: 'unset',
                        transition: 'border-color 0.15s, color 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#475569'; }}
                    >
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
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
      {previewLead && (
        <PreviewDrawer
          lead={previewLead}
          onClose={() => setPreviewLead(null)}
          onSent={(placeId) => {
            if (onContacted) onContacted(placeId);
          }}
        />
      )}
    </>
  );
}
