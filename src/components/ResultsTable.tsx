'use client';

import { useState } from 'react';
import type { Lead } from '@/types';
import {
  PhoneIcon,
  WhatsAppIcon,
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
  StarIcon,
  MessageIcon,
} from './icons';
import PriorityBadge from './PriorityBadge';
import MessageModal from './MessageModal';

interface Props {
  leads: Lead[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
      title="Copy"
    >
      {copied ? (
        <CheckIcon size={14} className="text-green-400" />
      ) : (
        <CopyIcon size={14} />
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    OPERATIONAL: { label: 'Open', color: 'text-green-400' },
    CLOSED_TEMPORARILY: { label: 'Temp. Closed', color: 'text-amber-400' },
    CLOSED_PERMANENTLY: { label: 'Closed', color: 'text-red-400' },
  };
  const cfg = map[status] ?? { label: status, color: 'text-slate-400' };
  return (
    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
  );
}

function RatingDisplay({ rating, count }: { rating: number | null; count: number | null }) {
  if (!rating) return <span className="text-slate-600 text-xs">No rating</span>;
  return (
    <div className="flex items-center gap-1">
      <StarIcon size={12} className="text-amber-400" filled />
      <span className="text-sm font-medium text-white tabular-nums">
        {rating.toFixed(1)}
      </span>
      {count && (
        <span className="text-xs text-slate-500">({count})</span>
      )}
    </div>
  );
}

export default function ResultsTable({ leads }: Props) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  if (leads.length === 0) return null;

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest w-8">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Business</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Priority</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Website</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Rating</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Outreach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {leads.map((lead, i) => (
              <tr
                key={lead.place_id}
                className="bg-slate-950 hover:bg-slate-900/60 transition-colors"
              >
                <td className="px-4 py-4 text-slate-600 tabular-nums text-xs font-mono">
                  {i + 1}
                </td>

                <td className="px-4 py-4 max-w-xs">
                  <p className="font-medium text-white truncate">{lead.name}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {lead.formatted_address}
                  </p>
                </td>

                <td className="px-4 py-4">
                  <PriorityBadge score={lead.weakness_score} />
                  <p className="text-xs text-slate-600 mt-1.5 max-w-[160px] leading-snug">
                    {lead.weakness_reasons[0]}
                  </p>
                </td>

                <td className="px-4 py-4">
                  {lead.phone ? (
                    <div className="flex items-center gap-2">
                      <PhoneIcon size={14} className="text-green-400 shrink-0" />
                      <span className="text-white font-mono text-xs tabular-nums">
                        {lead.phone}
                      </span>
                      <CopyButton text={lead.phone} />
                    </div>
                  ) : (
                    <span className="text-slate-600 text-xs">No phone</span>
                  )}
                </td>

                <td className="px-4 py-4">
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors text-xs max-w-[140px]"
                    >
                      <span className="truncate">
                        {new URL(lead.website).hostname.replace('www.', '')}
                      </span>
                      <ExternalLinkIcon size={12} className="shrink-0" />
                    </a>
                  ) : (
                    <span className="text-red-400 text-xs font-medium">No website</span>
                  )}
                </td>

                <td className="px-4 py-4">
                  <RatingDisplay
                    rating={lead.rating}
                    count={lead.user_ratings_total}
                  />
                </td>

                <td className="px-4 py-4">
                  <StatusBadge status={lead.business_status} />
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {lead.whatsapp_link && (
                      <a
                        href={lead.whatsapp_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] transition-colors"
                        title="Open WhatsApp"
                      >
                        <WhatsAppIcon size={16} />
                      </a>
                    )}
                    <button
                      onClick={() => setActiveLead(lead)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                      title="View message"
                    >
                      <MessageIcon size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeLead && (
        <MessageModal lead={activeLead} onClose={() => setActiveLead(null)} />
      )}
    </>
  );
}
