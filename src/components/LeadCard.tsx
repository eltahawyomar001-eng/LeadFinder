'use client';

import { useState } from 'react';
import type { Lead } from '@/types';
import { getPriority } from '@/lib/scoring';
import { CopyIcon, CheckIcon, ExternalLinkIcon, MessageIcon } from './icons';

const PRIORITY_STYLE = {
  high:   { label: 'High Priority', bg: '#450a0a', border: '#7f1d1d', text: '#fca5a5', dot: '#ef4444' },
  medium: { label: 'Medium',        bg: '#431407', border: '#7c2d12', text: '#fdba74', dot: '#f97316' },
  low:    { label: 'Low',           bg: '#0c1a2e', border: '#1e3a5f', text: '#93c5fd', dot: '#3b82f6' },
};

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <button
      onClick={copy}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: done ? '#34d399' : '#334155', minHeight: 'unset' }}
    >
      {done ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
    </button>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min((score / 10) * 100, 100);
  const color = score >= 7 ? '#ef4444' : score >= 4 ? '#f97316' : '#22c55e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ flex: 1, height: '3px', backgroundColor: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '999px' }} />
      </div>
      <span style={{ color, fontSize: '11px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {score}/10
      </span>
    </div>
  );
}

interface Props {
  lead: Lead;
  index: number;
  onViewMessage: (lead: Lead) => void;
  onEmailFound?: (placeId: string, email: string) => void;
  contacted?: boolean;
  onContacted?: (placeId: string) => void;
}

export default function LeadCard({ lead, index, onViewMessage, onEmailFound, contacted, onContacted }: Props) {
  const priority = getPriority(lead.weakness_score);
  const ps = PRIORITY_STYLE[priority];

  const [scrapingEmail, setScrapingEmail] = useState(false);
  const [scrapeAttempted, setScrapeAttempted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [addingToCrm, setAddingToCrm] = useState(false);
  const [inCrm, setInCrm] = useState(false);
  const [crmError, setCrmError] = useState<string | null>(null);

  const handleFindEmail = async () => {
    if (!lead.website || scrapingEmail) return;
    setScrapingEmail(true);
    try {
      const res = await fetch('/api/scrape-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: lead.website }),
      });
      const data = await res.json();
      if (data.email && onEmailFound) onEmailFound(lead.place_id, data.email);
    } finally {
      setScrapingEmail(false);
      setScrapeAttempted(true);
    }
  };

  const mailtoHref = `mailto:${lead.email ?? ''}?subject=${encodeURIComponent(lead.email_subject ?? '')}&body=${encodeURIComponent(lead.email_body ?? '')}`;
  const noEmailYet = !lead.email && !scrapeAttempted;

  const handleQuickSend = async () => {
    if (!lead.email || sending || contacted) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: lead.email, subject: lead.email_subject ?? '', body: lead.email_body ?? '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Send failed');
      if (onContacted) onContacted(lead.place_id);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleAddToCrm = async () => {
    if (!lead.email || addingToCrm || inCrm) return;
    setAddingToCrm(true);
    setCrmError(null);
    try {
      const res = await fetch('/api/crm/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'CRM add failed');
      setInCrm(true);
      if (onContacted) onContacted(lead.place_id);
    } catch (err) {
      setCrmError(err instanceof Error ? err.message : 'Failed to add to CRM');
    } finally {
      setAddingToCrm(false);
    }
  };

  const isOpen = lead.business_status === 'OPERATIONAL';
  const isClosed = lead.business_status === 'CLOSED_PERMANENTLY';
  const statusColor = isOpen ? '#4ade80' : isClosed ? '#f87171' : '#fb923c';
  const statusLabel = isOpen ? 'Open' : isClosed ? 'Closed' : 'Temp. Closed';

  return (
    <div style={{
      backgroundColor: '#06101f',
      border: '1px solid #0f1f36',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {/* ── Card header ── */}
      <div style={{ padding: '14px 16px 12px' }}>
        {/* Row 1: index + priority + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#1e293b', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace' }}>
              #{index + 1}
            </span>
            <span style={{
              backgroundColor: ps.bg, border: `1px solid ${ps.border}`, color: ps.text,
              borderRadius: '999px', padding: '2px 8px', fontSize: '10px', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: '4px',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: ps.dot, flexShrink: 0 }} />
              {ps.label}
            </span>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: statusColor }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0 }} />
            {statusLabel}
          </span>
        </div>

        {/* Name */}
        <p style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '15px', lineHeight: 1.3, marginBottom: '4px' }}>
          {lead.name}
        </p>

        {/* Address */}
        <p style={{ color: '#334155', fontSize: '12px', lineHeight: 1.4, marginBottom: '10px' }}>
          {lead.formatted_address}
        </p>

        {/* Score bar */}
        <ScoreBar score={lead.weakness_score} />
      </div>

      <div style={{ height: '1px', backgroundColor: '#0a1628' }} />

      {/* ── Contact info ── */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Phone */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', backgroundColor: '#0a1628', border: '1px solid #1e293b', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={lead.phone ? '#60a5fa' : '#1e293b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
            </svg>
          </div>
          {lead.phone
            ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                <span style={{ color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.phone}</span>
                <CopyBtn text={lead.phone} />
              </div>
            )
            : <span style={{ color: '#1e293b', fontSize: '12px' }}>No phone number</span>
          }
        </div>

        {/* Website */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', backgroundColor: '#0a1628', border: '1px solid #1e293b', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={lead.website ? '#60a5fa' : '#1e293b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
          </div>
          {lead.website
            ? (
              <a href={lead.website} target="_blank" rel="noopener noreferrer"
                style={{ color: '#60a5fa', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                {new URL(lead.website).hostname.replace('www.', '')}
                <ExternalLinkIcon size={11} />
              </a>
            )
            : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
                No website
              </span>
            )
          }
        </div>

        {/* Email */}
        {lead.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', backgroundColor: '#052e16', border: '1px solid #166534', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
              <span style={{ color: '#34d399', fontSize: '12px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lead.email}
              </span>
              <CopyBtn text={lead.email} />
            </div>
          </div>
        )}

        {/* Weakness reason */}
        {lead.weakness_reasons[0] && (
          <div style={{ backgroundColor: '#050d1a', border: '1px solid #0a1628', borderRadius: '8px', padding: '8px 10px' }}>
            <p style={{ color: '#334155', fontSize: '11px', lineHeight: 1.5 }}>
              {lead.weakness_reasons[0]}
            </p>
          </div>
        )}
      </div>

      <div style={{ height: '1px', backgroundColor: '#0a1628' }} />

      {/* ── Actions ── */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {lead.email ? (
          <>
            {/* Primary: Add to CRM */}
            {inCrm || contacted ? (
              <a href="/crm" style={{
                width: '100%', backgroundColor: '#052e16', border: '1px solid #166534',
                color: '#4ade80', borderRadius: '10px', padding: '12px 16px',
                fontSize: '13px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                textDecoration: 'none',
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                In CRM — View Pipeline
              </a>
            ) : (
              <button
                onClick={handleAddToCrm}
                disabled={addingToCrm}
                style={{
                  width: '100%',
                  backgroundColor: addingToCrm ? '#0f172a' : '#1d4ed8',
                  border: `1px solid ${addingToCrm ? '#334155' : '#3b82f6'}`,
                  color: '#fff', borderRadius: '10px', padding: '13px 16px',
                  fontSize: '13px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  cursor: addingToCrm ? 'not-allowed' : 'pointer',
                  opacity: addingToCrm ? 0.7 : 1,
                }}
              >
                {addingToCrm ? (
                  <>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                    Adding to CRM…
                  </>
                ) : (
                  <>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Add to CRM &amp; Send
                  </>
                )}
              </button>
            )}

            {crmError && (
              <p style={{ color: '#f87171', fontSize: '11px', textAlign: 'center', margin: '0' }}>{crmError}</p>
            )}

            {/* Secondary actions row */}
            {!inCrm && !contacted && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleQuickSend}
                  disabled={sending}
                  style={{
                    flex: 1, backgroundColor: 'transparent', border: '1px solid #1e293b',
                    color: '#475569', borderRadius: '8px', padding: '9px',
                    fontSize: '12px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    cursor: sending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sending ? 'Sending…' : 'Send only'}
                </button>
                <button
                  onClick={() => onViewMessage(lead)}
                  style={{
                    flex: 1, backgroundColor: '#0a1628', border: '1px solid #1e293b',
                    color: '#93c5fd', borderRadius: '8px', padding: '9px',
                    fontSize: '12px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    cursor: 'pointer',
                  }}
                >
                  <MessageIcon size={14} />
                  View Pitch
                </button>
              </div>
            )}

            {sendError && (
              <p style={{ color: '#f87171', fontSize: '11px', textAlign: 'center', margin: '0' }}>{sendError}</p>
            )}

            {!inCrm && !contacted && (
              <a href={mailtoHref} style={{ color: '#1e293b', fontSize: '11px', textAlign: 'center', textDecoration: 'underline' }}>
                open in email client
              </a>
            )}
          </>
        ) : (
          <>
            {/* Find email */}
            {!lead.email && lead.website && noEmailYet ? (
              <button
                onClick={handleFindEmail}
                disabled={scrapingEmail}
                style={{
                  width: '100%',
                  backgroundColor: scrapingEmail ? '#0f172a' : '#1e3a5f',
                  border: `1px solid ${scrapingEmail ? '#334155' : '#3b82f6'}`,
                  color: scrapingEmail ? '#64748b' : '#93c5fd',
                  borderRadius: '10px', padding: '13px 16px',
                  fontSize: '13px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  cursor: scrapingEmail ? 'not-allowed' : 'pointer',
                }}
              >
                {scrapingEmail ? (
                  <>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                    Searching website + Impressum…
                  </>
                ) : (
                  <>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    Find Email from Website
                  </>
                )}
              </button>
            ) : scrapeAttempted && !lead.email ? (
              <div style={{
                width: '100%', backgroundColor: '#0f172a', border: '1px solid #1e293b',
                color: '#475569', borderRadius: '10px', padding: '12px 16px',
                fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              }}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                No email found on website or Impressum
              </div>
            ) : null}

            {/* View pitch always visible */}
            <button
              onClick={() => onViewMessage(lead)}
              style={{
                width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b',
                color: '#93c5fd', borderRadius: '10px', padding: '11px 16px',
                fontSize: '13px', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                cursor: 'pointer',
              }}
            >
              <MessageIcon size={15} />
              View &amp; Copy Email Pitch
            </button>
          </>
        )}
      </div>
    </div>
  );
}
