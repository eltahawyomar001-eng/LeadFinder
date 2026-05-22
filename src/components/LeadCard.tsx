'use client';

import { useState } from 'react';
import type { Lead } from '@/types';
import { getPriority } from '@/lib/scoring';
import { WhatsAppIcon, CopyIcon, CheckIcon, ExternalLinkIcon, StarIcon, MessageIcon } from './icons';

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
}

export default function LeadCard({ lead, index, onViewMessage }: Props) {
  const priority = getPriority(lead.weakness_score);
  const ps = PRIORITY_STYLE[priority];
  const whatsappWithMessage = lead.whatsapp_link
    ? `${lead.whatsapp_link}?text=${encodeURIComponent(lead.whatsapp_message)}`
    : null;

  return (
    <div style={{
      backgroundColor: '#0a1628',
      border: '1px solid #1e293b',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {/* Top row: index + priority + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#334155', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>
            #{index + 1}
          </span>
          <span style={{
            backgroundColor: ps.bg,
            border: `1px solid ${ps.border}`,
            color: ps.text,
            borderRadius: '999px',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: ps.dot, flexShrink: 0 }} />
            {ps.label}
          </span>
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: lead.business_status === 'OPERATIONAL' ? '#34d399'
               : lead.business_status === 'CLOSED_PERMANENTLY' ? '#f87171' : '#fb923c',
        }}>
          {lead.business_status === 'OPERATIONAL' ? 'Open'
         : lead.business_status === 'CLOSED_PERMANENTLY' ? 'Closed'
         : lead.business_status === 'CLOSED_TEMPORARILY' ? 'Temp. Closed' : lead.business_status}
        </span>
      </div>

      {/* Business name + address */}
      <div style={{ padding: '10px 16px 14px' }}>
        <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '16px', lineHeight: 1.3, marginBottom: '4px' }}>
          {lead.name}
        </p>
        <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.4 }}>
          {lead.formatted_address}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: '#1e293b' }} />

      {/* Details */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Phone */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={lead.phone ? '#34d399' : '#334155'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
            </svg>
            {lead.phone ? (
              <span style={{ color: '#e2e8f0', fontSize: '14px', fontFamily: 'monospace' }}>{lead.phone}</span>
            ) : (
              <span style={{ color: '#475569', fontSize: '13px' }}>No phone number</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {lead.phone && <CopyBtn text={lead.phone} />}
            {lead.phone && (
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '999px',
                backgroundColor: lead.is_mobile ? '#052e16' : '#1c1917',
                border: `1px solid ${lead.is_mobile ? '#166534' : '#44403c'}`,
                color: lead.is_mobile ? '#4ade80' : '#78716c',
              }}>
                {lead.is_mobile ? 'Mobile' : 'Landline'}
              </span>
            )}
          </div>
        </div>

        {/* Website */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={lead.website ? '#60a5fa' : '#334155'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
            {lead.website ? (
              <a href={lead.website} target="_blank" rel="noopener noreferrer"
                style={{ color: '#60a5fa', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {new URL(lead.website).hostname.replace('www.', '')}
                <ExternalLinkIcon size={11} />
              </a>
            ) : (
              <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>No website</span>
            )}
          </div>
          {/* Rating */}
          {lead.rating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              <span style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600 }}>{lead.rating.toFixed(1)}</span>
              {lead.user_ratings_total && (
                <span style={{ color: '#475569', fontSize: '12px' }}>({lead.user_ratings_total})</span>
              )}
            </div>
          )}
        </div>

        {/* Weakness reason */}
        <p style={{ color: '#64748b', fontSize: '12px', backgroundColor: '#0f172a', borderRadius: '8px', padding: '8px 10px', margin: 0, lineHeight: 1.5 }}>
          {lead.weakness_reasons[0]}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: '#1e293b' }} />

      {/* Actions */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: '10px' }}>
        {whatsappWithMessage ? (
          <a
            href={whatsappWithMessage}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              backgroundColor: lead.is_mobile ? '#15803d' : '#166534',
              color: '#fff',
              borderRadius: '12px',
              padding: '13px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              textDecoration: 'none',
              opacity: lead.is_mobile ? 1 : 0.7,
            }}
          >
            <WhatsAppIcon size={17} />
            {lead.is_mobile ? 'Send on WhatsApp' : 'Try WhatsApp'}
          </a>
        ) : (
          <div style={{
            flex: 1,
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#475569',
            borderRadius: '12px',
            padding: '13px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            No phone — skip
          </div>
        )}
        <button
          onClick={() => onViewMessage(lead)}
          style={{
            flex: 1,
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#93c5fd',
            borderRadius: '12px',
            padding: '13px',
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
          View Pitch
        </button>
      </div>
    </div>
  );
}
