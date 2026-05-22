'use client';

import { useState } from 'react';
import type { Lead } from '@/types';
import LeadCard from './LeadCard';
import MessageModal from './MessageModal';

interface Props {
  leads: Lead[];
}

export default function ResultsTable({ leads }: Props) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  if (leads.length === 0) return null;

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {leads.map((lead, i) => (
          <LeadCard
            key={lead.place_id}
            lead={lead}
            index={i}
            onViewMessage={setActiveLead}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#0d1628', borderBottom: '1px solid #1e293b' }}>
              {['#', 'Business', 'Priority', 'Phone', 'Website', 'Rating', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {leads.map((lead, i) => {
              const whatsappWithMessage = lead.whatsapp_link
                ? `${lead.whatsapp_link}?text=${encodeURIComponent(lead.whatsapp_message)}`
                : null;
              return (
                <tr key={lead.place_id} style={{ backgroundColor: '#020609' }} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-4 py-4 text-slate-600 text-xs font-mono">{i + 1}</td>
                  <td className="px-4 py-4 max-w-[200px]">
                    <p className="font-semibold text-white truncate">{lead.name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{lead.formatted_address}</p>
                  </td>
                  <td className="px-4 py-4">
                    {(() => {
                      const p = lead.weakness_score >= 6 ? 'high' : lead.weakness_score >= 3 ? 'medium' : 'low';
                      const cfg = {
                        high:   { label: 'High Priority', bg: '#450a0a', border: '#7f1d1d', text: '#fca5a5', dot: '#ef4444' },
                        medium: { label: 'Medium',        bg: '#431407', border: '#7c2d12', text: '#fdba74', dot: '#f97316' },
                        low:    { label: 'Low',           bg: '#0c1a2e', border: '#1e3a5f', text: '#93c5fd', dot: '#3b82f6' },
                      }[p];
                      return (
                        <span style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text, borderRadius: '999px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cfg.dot }} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                    <p className="text-xs text-slate-600 mt-1 max-w-[150px] leading-snug">{lead.weakness_reasons[0]}</p>
                  </td>
                  <td className="px-4 py-4">
                    {lead.phone ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-white font-mono text-xs">{lead.phone}</span>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '999px', alignSelf: 'flex-start',
                          backgroundColor: lead.is_mobile ? '#052e16' : '#1c1917',
                          border: `1px solid ${lead.is_mobile ? '#166534' : '#44403c'}`,
                          color: lead.is_mobile ? '#4ade80' : '#78716c',
                        }}>
                          {lead.is_mobile ? 'Mobile' : 'Landline'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">No phone</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {lead.website ? (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 max-w-[130px]">
                        <span className="truncate">{new URL(lead.website).hostname.replace('www.', '')}</span>
                        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                      </a>
                    ) : (
                      <span className="text-red-400 text-xs font-semibold">No website</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {lead.rating ? (
                      <div className="flex items-center gap-1">
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        <span className="text-white text-sm font-semibold">{lead.rating.toFixed(1)}</span>
                        {lead.user_ratings_total && <span className="text-slate-500 text-xs">({lead.user_ratings_total})</span>}
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span style={{ fontSize: '12px', fontWeight: 600, color: lead.business_status === 'OPERATIONAL' ? '#34d399' : lead.business_status === 'CLOSED_PERMANENTLY' ? '#f87171' : '#fb923c' }}>
                      {lead.business_status === 'OPERATIONAL' ? 'Open' : lead.business_status === 'CLOSED_PERMANENTLY' ? 'Closed' : 'Temp. Closed'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {whatsappWithMessage && (
                        <a href={whatsappWithMessage} target="_blank" rel="noopener noreferrer"
                          style={{ backgroundColor: lead.is_mobile ? '#15803d' : 'rgba(21,128,61,0.4)', width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', minHeight: 'unset' }}
                          title={lead.is_mobile ? 'Send on WhatsApp' : 'Landline — may not work'}>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                        </a>
                      )}
                      <button onClick={() => setActiveLead(lead)}
                        style={{ backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', cursor: 'pointer', minHeight: 'unset' }}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeLead && (
        <MessageModal lead={activeLead} onClose={() => setActiveLead(null)} />
      )}
    </>
  );
}
