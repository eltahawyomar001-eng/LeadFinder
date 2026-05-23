'use client';

import { useState } from 'react';
import type { Lead } from '@/types';
import { CopyIcon, CheckIcon } from './icons';

interface Props {
  lead: Lead;
  onClose: () => void;
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <button
      onClick={copy}
      style={{
        backgroundColor: done ? '#166534' : '#1e293b',
        border: `1px solid ${done ? '#166534' : '#334155'}`,
        color: done ? '#86efac' : '#f1f5f9',
        borderRadius: '10px',
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {done ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
      {done ? 'Copied!' : label}
    </button>
  );
}

export default function MessageModal({ lead, onClose }: Props) {
  const subject = lead.email_subject ?? '';
  const body = lead.email_body ?? '';

  const mailtoHref = `mailto:${lead.email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid #334155', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Email Pitch
            </p>
            <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '17px', lineHeight: 1.2, margin: 0 }}>
              {lead.name}
            </h3>
            {lead.email && (
              <p style={{ color: '#34d399', fontSize: '13px', fontFamily: 'monospace', marginTop: '4px' }}>
                {lead.email}
              </p>
            )}
            {!lead.email && (
              <p style={{ color: '#475569', fontSize: '12px', marginTop: '4px' }}>
                No email found — add recipient manually
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, lineHeight: 1 }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Subject */}
        <div style={{ padding: '16px 20px 0' }}>
          <p style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Subject
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              readOnly
              value={subject}
              style={{
                flex: 1,
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                color: '#e2e8f0',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <CopyBtn text={subject} label="Copy" />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 20px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <p style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Body
          </p>
          <textarea
            readOnly
            value={body}
            style={{
              flex: 1,
              minHeight: '220px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              color: '#e2e8f0',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '13px',
              lineHeight: 1.7,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <CopyBtn text={body} label="Copy Body" />
          <a
            href={mailtoHref}
            style={{
              flex: 1,
              minWidth: '140px',
              backgroundColor: lead.email ? '#15803d' : '#1e3a2e',
              color: '#fff',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textDecoration: 'none',
              border: `1px solid ${lead.email ? '#166534' : '#1a4a32'}`,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {lead.email ? `Send to ${lead.email}` : 'Open in Email Client'}
          </a>
        </div>
      </div>
    </div>
  );
}
