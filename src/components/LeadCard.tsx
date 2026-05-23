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
  const copy = () => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); };
  return (
    <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: done ? '#34d399' : '#64748b', minHeight: 'unset' }}>
      {done ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
    </button>
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

  const handleFindEmail = async () => {
    if (!lead.website || scrapingEmail) return;
    setScrapingEmail(true);
    try {
      const res = await fetch('/api/scrape-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: lead.website }),
      });
      const { email } = await res.json();
      if (email && onEmailFound) onEmailFound(lead.place_id, email);
    } finally {
      setScrapingEmail(false);
      setScrapeAttempted(true);
    }
  };

  const mailtoHref = `mailto:${lead.email ?? ''}?subject=${encodeURIComponent(lead.email_subject ?? '')}&body=${encodeURIComponent(lead.email_body ?? '')}`;
  const noEmailYet = !lead.email && !scrapeAttempted;

  const handleGmailSend = async () => {
    if (!lead.email || sending || contacted) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject: lead.email_subject ?? '',
          body: lead.email_body ?? '',
        }),
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

  return (
    <div style={{ backgroundColor: '#0a1628', border: '1px solid #1e293b', borderRadius: '16px', overflow: 'hidden' }}>

      {/* Top: index + priority + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#334155', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>#{index + 1}</span>
          <span style={{
            backgroundColor: ps.bg, border: `1px solid ${ps.border}`, color: ps.text,
            borderRadius: '999px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: ps.dot, flexShrink: 0 }} />
            {ps.label}
          </span>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 600,
          color: lead.business_status === 'OPERATIONAL' ? '#34d399' : lead.business_status === 'CLOSED_PERMANENTLY' ? '#f87171' : '#fb923c',
        }}>
          {lead.business_status === 'OPERATIONAL' ? 'Open' : lead.business_status === 'CLOSED_PERMANENTLY' ? 'Closed' : 'Temp. Closed'}
        </span>
      </div>

      {/* Name + address */}
      <div style={{ padding: '10px 16px 14px' }}>
        <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '16px', lineHeight: 1.3, marginBottom: '4px' }}>{lead.name}</p>
        <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.4 }}>{lead.formatted_address}</p>
      </div>

      <div style={{ height: '1px', backgroundColor: '#1e293b' }} />

      {/* Contact info */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Phone — info only, no action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={lead.phone ? '#60a5fa' : '#334155'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
          </svg>
          {lead.phone
            ? <span style={{ color: '#e2e8f0', fontSize: '14px', fontFamily: 'monospace' }}>{lead.phone}</span>
            : <span style={{ color: '#334155', fontSize: '13px' }}>No phone</span>
          }
          {lead.phone && <CopyBtn text={lead.phone} />}
        </div>

        {/* Website */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={lead.website ? '#60a5fa' : '#334155'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
          {lead.website
            ? <a href={lead.website} target="_blank" rel="noopener noreferrer"
                style={{ color: '#60a5fa', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                {new URL(lead.website).hostname.replace('www.', '')}
                <ExternalLinkIcon size={11} />
              </a>
            : <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>No website</span>
          }
        </div>

        {/* Email — shown when found */}
        {lead.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span style={{ color: '#34d399', fontSize: '13px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
              {lead.email}
            </span>
            <CopyBtn text={lead.email} />
          </div>
        )}

        {/* Weakness reason */}
        <p style={{ color: '#64748b', fontSize: '12px', backgroundColor: '#0f172a', borderRadius: '8px', padding: '8px 10px', margin: 0, lineHeight: 1.5 }}>
          {lead.weakness_reasons[0]}
        </p>
      </div>

      <div style={{ height: '1px', backgroundColor: '#1e293b' }} />

      {/* Actions */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Primary: Gmail send when email found */}
        {lead.email && (
          <>
            {contacted ? (
              <div style={{
                width: '100%', backgroundColor: '#052e16', border: '1px solid #166534',
                color: '#4ade80', borderRadius: '12px', padding: '12px 16px',
                fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Sent to {lead.email}
              </div>
            ) : (
              <button
                onClick={handleGmailSend}
                disabled={sending}
                style={{
                  width: '100%',
                  backgroundColor: sending ? '#0f172a' : '#15803d',
                  border: `1px solid ${sending ? '#334155' : '#166534'}`,
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '13px 16px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? (
                  <>
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Send via Gmail — {lead.email}
                  </>
                )}
              </button>
            )}
            {sendError && (
              <p style={{ color: '#f87171', fontSize: '12px', margin: '0', textAlign: 'center' }}>{sendError}</p>
            )}
            {/* Fallback mailto link */}
            {!contacted && (
              <a href={mailtoHref} style={{ color: '#475569', fontSize: '12px', textAlign: 'center', textDecoration: 'underline' }}>
                or open in email client instead
              </a>
            )}
          </>
        )}

        {/* Find email section */}
        {!lead.email && lead.website && noEmailYet ? (
          /* Has website but email not found yet — offer to search */
          <button
            onClick={handleFindEmail}
            disabled={scrapingEmail}
            style={{
              width: '100%',
              backgroundColor: scrapingEmail ? '#0f172a' : '#1e3a5f',
              border: `1px solid ${scrapingEmail ? '#334155' : '#3b82f6'}`,
              color: scrapingEmail ? '#64748b' : '#93c5fd',
              borderRadius: '12px',
              padding: '13px 16px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: scrapingEmail ? 'not-allowed' : 'pointer',
            }}
          >
            {scrapingEmail ? (
              <>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Searching website + Impressum...
              </>
            ) : (
              <>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Find Email from Website
              </>
            )}
          </button>
        ) : scrapeAttempted && !lead.email ? (
          /* Scrape tried, no email found */
          <div style={{
            width: '100%', backgroundColor: '#1a0a0a', border: '1px solid #3f1515',
            color: '#94645b', borderRadius: '12px', padding: '12px 16px',
            fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            No email found on website or Impressum
          </div>
        ) : null}

        {/* Secondary: view / copy the pitch */}
        <button
          onClick={() => onViewMessage(lead)}
          style={{
            width: '100%',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#93c5fd',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            cursor: 'pointer',
          }}
        >
          <MessageIcon size={16} />
          View &amp; Copy Email Pitch
        </button>
      </div>
    </div>
  );
}
