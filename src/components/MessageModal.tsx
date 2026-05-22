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

  // Pre-fill WhatsApp with the message so Omar just hits send
  const whatsappWithMessage = lead.whatsapp_link
    ? `${lead.whatsapp_link}?text=${encodeURIComponent(lead.whatsapp_message)}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-1">
              Your WhatsApp Pitch
            </p>
            <h3 className="text-white font-semibold">{lead.name}</h3>
            {lead.phone && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{lead.phone}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs text-slate-500 mb-2">
            Personalized in German — from Omar Rageh, ready to send
          </p>
          <textarea
            readOnly
            value={lead.whatsapp_message}
            rows={10}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 resize-none leading-relaxed focus:outline-none"
          />
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <CheckIcon size={16} className="text-green-400" />
                Copied
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
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              <WhatsAppIcon size={16} />
              Send on WhatsApp
            </a>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 text-slate-600 rounded-lg py-2.5 text-sm">
              No phone number
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
