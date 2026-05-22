'use client';

import { useState } from 'react';
import type { Lead } from '@/types';
import { CopyIcon, CheckIcon, WhatsAppIcon } from './icons';

interface Props {
  lead: Lead;
  onClose: () => void;
}

export default function MessageModal({ lead, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(lead.whatsapp_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappWithMessage = lead.whatsapp_link
    ? `${lead.whatsapp_link}?text=${encodeURIComponent(lead.whatsapp_message)}`
    : null;

  return (
    <div
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
        className="rounded-2xl w-full max-w-lg shadow-2xl"
      >
        {/* Header */}
        <div
          style={{ borderBottom: '1px solid #334155' }}
          className="flex items-center justify-between p-5"
        >
          <div>
            <p style={{ color: '#94a3b8' }} className="text-xs font-semibold uppercase tracking-widest mb-1">
              Your WhatsApp Pitch
            </p>
            <h3 style={{ color: '#f1f5f9' }} className="font-bold text-lg leading-tight">
              {lead.name}
            </h3>
            {lead.phone && (
              <p style={{ color: '#64748b' }} className="text-xs mt-1 font-mono">
                {lead.phone}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ color: '#64748b' }}
            className="hover:text-white transition-colors p-1"
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Message */}
        <div className="p-5">
          <p style={{ color: '#94a3b8' }} className="text-xs mb-3 font-medium">
            Personalized in German — from Omar Rageh, ready to send
          </p>
          <textarea
            readOnly
            value={lead.whatsapp_message}
            rows={10}
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              color: '#e2e8f0',
              width: '100%',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '13px',
              lineHeight: '1.7',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={copy}
            style={{
              flex: 1,
              backgroundColor: copied ? '#166534' : '#1e293b',
              border: '1px solid #334155',
              color: copied ? '#86efac' : '#f1f5f9',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            {copied ? (
              <>
                <CheckIcon size={16} />
                Copied!
              </>
            ) : (
              <>
                <CopyIcon size={16} />
                Copy Message
              </>
            )}
          </button>

          {whatsappWithMessage ? (
            <a
              href={whatsappWithMessage}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                backgroundColor: '#25D366',
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
              }}
            >
              <WhatsAppIcon size={16} />
              Send on WhatsApp
            </a>
          ) : (
            <div
              style={{
                flex: 1,
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#475569',
                borderRadius: '10px',
                padding: '10px 16px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              No phone number
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
