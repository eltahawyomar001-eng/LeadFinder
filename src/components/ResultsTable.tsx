'use client';

import { useState } from 'react';
import type { Lead } from '@/types';
import LeadCard from './LeadCard';
import MessageModal from './MessageModal';

interface Props {
  leads: Lead[];
}

const PRIORITY: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  high:   { label: 'High Priority', bg: '#450a0a', border: '#7f1d1d', text: '#fca5a5', dot: '#ef4444' },
  medium: { label: 'Medium',        bg: '#431407', border: '#7c2d12', text: '#fdba74', dot: '#f97316' },
  low:    { label: 'Low',           bg: '#0c1a2e', border: '#1e3a5f', text: '#93c5fd', dot: '#3b82f6' },
};

function priorityKey(score: number) {
  return score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';
}

export default function ResultsTable({ leads }: Props) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  if (leads.length === 0) return null;

  return (
    <>
      {/* ── Mobile: stacked cards (< 768 px) ───────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="md:hidden">
        {leads.map((lead, i) => (
          <LeadCard key={lead.place_id} lead={lead} index={i} onViewMessage={setActiveLead} />
        ))}
      </div>

      {/* ── Desktop: compact table (≥ 768 px) ──────────────────────────────── */}
      <div
        className="hidden md:block"
        style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #1e293b' }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '780px' }}>
          <colgroup>
            <col style={{ width: '42px' }} />   {/* # */}
            <col style={{ width: '220px' }} />  {/* Business */}
            <col style={{ width: '130px' }} />  {/* Priority */}
            <col style={{ width: '150px' }} />  {/* Phone */}
            <col style={{ width: '140px' }} />  {/* Website */}
            <col style={{ width: '80px' }} />   {/* Rating */}
            <col style={{ width: '68px' }} />   {/* Status */}
            <col style={{ width: '80px' }} />   {/* Actions */}
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: '#0d1628', borderBottom: '1px solid #1e293b' }}>
              {['#', 'Business', 'Priority', 'Phone', 'Website', 'Rating', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => {
              const pk = priorityKey(lead.weakness_score);
              const pc = PRIORITY[pk];
              const whatsappWithMessage = lead.whatsapp_link
                ? `${lead.whatsapp_link}?text=${encodeURIComponent(lead.whatsapp_message)}`
                : null;
              const isEven = i % 2 === 0;

              return (
                <tr
                  key={lead.place_id}
                  style={{ backgroundColor: isEven ? '#020609' : '#050d1a', borderBottom: '1px solid #0f1f36' }}
                >
                  {/* # */}
                  <td style={{ padding: '12px 14px', color: '#334155', fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {i + 1}
                  </td>

                  {/* Business name + address */}
                  <td style={{ padding: '12px 14px' }}>
                    <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                      {lead.name}
                    </p>
                    <p style={{ color: '#475569', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>
                      {lead.formatted_address}
                    </p>
                  </td>

                  {/* Priority badge — single line, no wrapping */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      backgroundColor: pc.bg,
                      border: `1px solid ${pc.border}`,
                      color: pc.text,
                      borderRadius: '999px',
                      padding: '3px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: pc.dot, flexShrink: 0 }} />
                      {pc.label}
                    </span>
                  </td>

                  {/* Phone + mobile/landline badge */}
                  <td style={{ padding: '12px 14px' }}>
                    {lead.phone ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lead.phone}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '1px 7px',
                          borderRadius: '999px', alignSelf: 'flex-start',
                          backgroundColor: lead.is_mobile ? '#052e16' : '#1c1917',
                          border: `1px solid ${lead.is_mobile ? '#166534' : '#44403c'}`,
                          color: lead.is_mobile ? '#4ade80' : '#78716c',
                        }}>
                          {lead.is_mobile ? 'Mobile' : 'Landline'}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#334155', fontSize: '13px' }}>No phone</span>
                    )}
                  </td>

                  {/* Website */}
                  <td style={{ padding: '12px 14px' }}>
                    {lead.website ? (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#60a5fa', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {new URL(lead.website).hostname.replace('www.', '')}
                        </span>
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    ) : (
                      <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>No website</span>
                    )}
                  </td>

                  {/* Rating */}
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    {lead.rating ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600 }}>{lead.rating.toFixed(1)}</span>
                        {lead.user_ratings_total && (
                          <span style={{ color: '#475569', fontSize: '11px' }}>({lead.user_ratings_total})</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#334155', fontSize: '13px' }}>—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: 600,
                      color: lead.business_status === 'OPERATIONAL' ? '#34d399'
                           : lead.business_status === 'CLOSED_PERMANENTLY' ? '#f87171' : '#fb923c',
                    }}>
                      {lead.business_status === 'OPERATIONAL' ? 'Open'
                     : lead.business_status === 'CLOSED_PERMANENTLY' ? 'Closed' : 'Temp.'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {whatsappWithMessage ? (
                        <a href={whatsappWithMessage} target="_blank" rel="noopener noreferrer"
                          title={lead.is_mobile ? 'Send on WhatsApp' : 'Landline — may not work'}
                          style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            backgroundColor: lead.is_mobile ? '#15803d' : 'rgba(21,128,61,0.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', textDecoration: 'none', flexShrink: 0,
                          }}>
                          <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </a>
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #1e293b', flexShrink: 0 }} />
                      )}
                      <button
                        onClick={() => setActiveLead(lead)}
                        title="View pitch"
                        style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#60a5fa', cursor: 'pointer', flexShrink: 0,
                        }}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
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
