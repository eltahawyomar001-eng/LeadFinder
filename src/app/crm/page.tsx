'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type CardStatus = 'contacted' | 'replied' | 'meeting' | 'proposal' | 'won' | 'lost';

interface SequenceRow {
  id: string;
  step: number;
  status: string;
  scheduled_for: string;
  sent_at: string | null;
  opened_at: string | null;
  subject: string;
  body: string;
}

interface LeadRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  country: string;
  weakness_score: number;
  weakness_reasons: string[];
  email_subject: string | null;
  email_body: string | null;
  created_at: string;
}

interface CrmCard {
  id: string;
  status: CardStatus;
  notes: string | null;
  value_eur: number | null;
  created_at: string;
  updated_at: string;
  lf_leads: LeadRow;
  lf_sequences: SequenceRow[];
}

interface WarmupStatus {
  ok: boolean;
  count: number;
  limit: number;
  week: number;
  daysUntilRamp: number;
  nextLimit: number;
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: {
  key: CardStatus;
  label: string;
  color: string;
  bg: string;
  border: string;
  accent: string;
}[] = [
  { key: 'contacted', label: 'Contacted', color: '#93c5fd', bg: '#0c1a2e', border: '#1e3a5f', accent: '#3b82f6' },
  { key: 'replied',   label: 'Replied',   color: '#fbbf24', bg: '#1c1208', border: '#78350f', accent: '#f59e0b' },
  { key: 'meeting',   label: 'Meeting',   color: '#a78bfa', bg: '#12082a', border: '#4c1d95', accent: '#8b5cf6' },
  { key: 'proposal',  label: 'Proposal',  color: '#f472b6', bg: '#1f0a18', border: '#831843', accent: '#ec4899' },
  { key: 'won',       label: 'Won',       color: '#4ade80', bg: '#052e16', border: '#166534', accent: '#22c55e' },
  { key: 'lost',      label: 'Lost',      color: '#64748b', bg: '#0f172a', border: '#1e293b', accent: '#475569' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function nextPendingSeq(sequences: SequenceRow[]): SequenceRow | null {
  return sequences
    .filter((s) => s.status === 'pending')
    .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())[0] ?? null;
}

function followUpLabel(seq: SequenceRow): { label: string; urgent: boolean; future: boolean } {
  const diff = new Date(seq.scheduled_for).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  const urgent = days <= 0;
  const future = days > 1;
  const label = urgent
    ? `Step ${seq.step} overdue`
    : days === 1
    ? `Step ${seq.step} — tomorrow`
    : `Step ${seq.step} — in ${days}d`;
  return { label, urgent, future };
}

// Deterministic pitch variant — mirrors pick(name, 3) in whatsapp.ts
function pitchVariant(name: string): 'A' | 'B' | 'C' {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % 3;
  return ['A', 'B', 'C'][idx] as 'A' | 'B' | 'C';
}

function scoreColor(score: number): string {
  if (score >= 7) return '#ef4444';
  if (score >= 4) return '#f97316';
  return '#22c55e';
}

function scoreBg(score: number): string {
  if (score >= 7) return '#450a0a';
  if (score >= 4) return '#431407';
  return '#052e16';
}

function scoreBorder(score: number): string {
  if (score >= 7) return '#7f1d1d';
  if (score >= 4) return '#7c2d12';
  return '#166534';
}

function scoreLabel(score: number): string {
  if (score >= 7) return 'High';
  if (score >= 4) return 'Mid';
  return 'Low';
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ColumnIcon({ status, size = 12 }: { status: CardStatus; size?: number }) {
  const p = {
    width: size, height: size, fill: 'none', stroke: 'currentColor',
    strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    flexShrink: 0,
  };
  switch (status) {
    case 'contacted': return <svg viewBox="0 0 24 24" {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
    case 'replied':   return <svg viewBox="0 0 24 24" {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
    case 'meeting':   return <svg viewBox="0 0 24 24" {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case 'proposal':  return <svg viewBox="0 0 24 24" {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case 'won':       return <svg viewBox="0 0 24 24" {...p}><polyline points="20 6 9 17 4 12"/></svg>;
    case 'lost':      return <svg viewBox="0 0 24 24" {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    default:          return null;
  }
}

// ─── Sequence Timeline ────────────────────────────────────────────────────────

function SequenceTimeline({ sequences, onSendNow }: {
  sequences: SequenceRow[];
  onSendNow: (seq: SequenceRow) => Promise<void>;
}) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const sorted = [...sequences].sort((a, b) => a.step - b.step);

  const statusStyle: Record<string, { color: string; bg: string; border: string; label: string }> = {
    sent:         { color: '#4ade80', bg: '#052e16', border: '#166534', label: 'Sent' },
    pending:      { color: '#fbbf24', bg: '#1c1208', border: '#78350f', label: 'Pending' },
    skipped:      { color: '#64748b', bg: '#0f172a', border: '#1e293b', label: 'Skipped' },
    unsubscribed: { color: '#f87171', bg: '#450a0a', border: '#7f1d1d', label: 'Unsubscribed' },
    replied:      { color: '#a78bfa', bg: '#12082a', border: '#4c1d95', label: 'Replied' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {sorted.map((seq, idx) => {
        const st = statusStyle[seq.status] ?? statusStyle.pending;
        const isPending = seq.status === 'pending';
        const isOverdue = isPending && new Date(seq.scheduled_for) < new Date();
        const isSent = seq.status === 'sent';

        return (
          <div key={seq.id} style={{ display: 'flex', gap: '12px' }}>
            {/* Timeline line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                backgroundColor: isSent ? '#052e16' : st.bg,
                border: `2px solid ${isSent ? '#166534' : st.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {isSent ? (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <span style={{ color: st.color, fontSize: '11px', fontWeight: 800 }}>{seq.step}</span>
                )}
              </div>
              {idx < sorted.length - 1 && (
                <div style={{ width: '2px', flex: 1, minHeight: '16px', backgroundColor: '#1e293b', marginTop: '4px' }} />
              )}
            </div>

            {/* Content */}
            <div style={{
              flex: 1, backgroundColor: '#050d1a',
              border: `1px solid ${isOverdue ? '#7f1d1d' : '#0f172a'}`,
              borderRadius: '10px', overflow: 'hidden',
              marginBottom: idx < sorted.length - 1 ? '0' : '0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #0f172a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 700 }}>
                    Step {seq.step}
                  </span>
                  <span style={{
                    backgroundColor: st.bg, border: `1px solid ${st.border}`,
                    color: st.color, borderRadius: '999px', padding: '1px 7px',
                    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const,
                  }}>
                    {isOverdue ? 'OVERDUE' : st.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#334155', fontSize: '10px' }}>
                      {seq.sent_at ? `Sent ${formatDate(seq.sent_at)}` : isPending ? `Due ${formatDate(seq.scheduled_for)}` : ''}
                    </span>
                    {seq.opened_at && (
                      <span style={{
                        backgroundColor: '#052e16', border: '1px solid #166534',
                        color: '#4ade80', borderRadius: '999px',
                        padding: '1px 7px', fontSize: '10px', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                      }}>
                        <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        Opened
                      </span>
                    )}
                  </div>
                  {isPending && (
                    <button
                      onClick={async () => { setSendingId(seq.id); await onSendNow(seq); setSendingId(null); }}
                      disabled={sendingId === seq.id}
                      style={{
                        backgroundColor: isOverdue ? '#7f1d1d' : '#1e3a5f',
                        border: `1px solid ${isOverdue ? '#ef4444' : '#3b82f6'}`,
                        color: isOverdue ? '#fca5a5' : '#93c5fd',
                        borderRadius: '6px', padding: '3px 10px',
                        fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                        opacity: sendingId === seq.id ? 0.6 : 1, minHeight: 'unset',
                      }}
                    >
                      {sendingId === seq.id ? 'Sending…' : 'Send now'}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ padding: '8px 12px' }}>
                <p style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>{seq.subject}</p>
                <p style={{ color: '#334155', fontSize: '10px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {seq.body.slice(0, 180)}{seq.body.length > 180 ? '…' : ''}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({
  card, onClose, onMove, onDelete, onUnsubscribe, onSendNow, onSaveNotes, onSaveValue, onRestart,
}: {
  card: CrmCard;
  onClose: () => void;
  onMove: (status: CardStatus) => Promise<void>;
  onDelete: () => Promise<void>;
  onUnsubscribe: () => Promise<void>;
  onSendNow: (seq: SequenceRow) => Promise<void>;
  onSaveNotes: (notes: string) => Promise<void>;
  onSaveValue: (eur: number | null) => Promise<void>;
  onRestart: () => Promise<void>;
}) {
  const lead = card.lf_leads;
  const [activeTab, setActiveTab] = useState<'info' | 'emails' | 'send' | 'proposal'>('info');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'ok' | 'error' | null>(null);
  const [notes, setNotes] = useState(card.notes ?? '');
  const [valueInput, setValueInput] = useState(card.value_eur?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unsub, setUnsub] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string; subject: string; body: string }[] | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const col = COLUMNS.find((c) => c.key === card.status)!;
  const sentCount = (card.lf_sequences ?? []).filter((s) => s.status === 'sent').length;
  const pendingCount = (card.lf_sequences ?? []).filter((s) => s.status === 'pending').length;
  const openCount = (card.lf_sequences ?? []).filter((s) => s.opened_at != null).length;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#040d1a',
          borderLeft: '1px solid #1e293b',
          width: '100%', maxWidth: '520px',
          height: '100dvh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.22s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 0',
          borderBottom: '1px solid #1e293b',
          position: 'sticky', top: 0,
          backgroundColor: '#040d1a', zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#f1f5f9', fontSize: '17px', fontWeight: 800, lineHeight: 1.25, marginBottom: '4px' }}>
                {lead.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  backgroundColor: col.bg, border: `1px solid ${col.border}`,
                  color: col.color, borderRadius: '999px', padding: '3px 10px',
                  fontSize: '11px', fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}>
                  <ColumnIcon status={col.key} size={10} /> {col.label}
                </span>
                <span style={{
                  backgroundColor: '#0a1628', border: '1px solid #1e293b',
                  color: '#475569', borderRadius: '999px', padding: '3px 10px',
                  fontSize: '11px', fontWeight: 700,
                }}>
                  Variant {pitchVariant(lead.name)}
                </span>
                {lead.email && (
                  <span style={{ color: '#60a5fa', fontSize: '12px', fontFamily: 'monospace' }}>
                    {lead.email}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: '#0a1628', border: '1px solid #1e293b', color: '#475569',
                cursor: 'pointer', padding: '8px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', minHeight: 'unset', flexShrink: 0,
              }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Quick stats strip */}
          <div style={{ display: 'flex', gap: '1px', marginBottom: '16px' }}>
            {[
              { label: 'Score', value: `${lead.weakness_score}/10`, color: scoreColor(lead.weakness_score) },
              { label: 'Sent', value: `${sentCount} email${sentCount !== 1 ? 's' : ''}`, color: '#4ade80' },
              { label: 'Opened', value: openCount > 0 ? `${openCount}×` : '—', color: openCount > 0 ? '#4ade80' : '#334155' },
              { label: 'Pending', value: `${pendingCount} step${pendingCount !== 1 ? 's' : ''}`, color: pendingCount > 0 ? '#fbbf24' : '#334155' },
            ].map((s) => (
              <div key={s.label} style={{
                flex: 1, backgroundColor: '#0a1628', padding: '8px 10px', textAlign: 'center',
                borderRight: '1px solid #1e293b',
              }}>
                <p style={{ color: '#334155', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{s.label}</p>
                <p style={{ color: s.color, fontSize: '12px', fontWeight: 800 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0' }}>
            {([
              { key: 'info', label: 'Details' },
              { key: 'emails', label: 'Sequence' },
              { key: 'send', label: 'Message' },
              { key: 'proposal', label: 'Proposal' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, padding: '10px', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', minHeight: 'unset',
                  background: 'none', border: 'none',
                  color: activeTab === tab.key ? col.color : '#475569',
                  borderBottom: `2px solid ${activeTab === tab.key ? col.accent : 'transparent'}`,
                  transition: 'color 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Contact info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lead.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: '#0a1628', border: '1px solid #1e293b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                      </svg>
                    </div>
                    <span style={{ color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace' }}>{lead.phone}</span>
                  </div>
                )}
                {lead.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: '#0a1628', border: '1px solid #1e293b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                      </svg>
                    </div>
                    <a href={lead.website} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#60a5fa', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  </div>
                )}
                {lead.weakness_reasons?.[0] && (
                  <div style={{ backgroundColor: '#050d1a', border: '1px solid #0f172a', borderRadius: '8px', padding: '10px 12px' }}>
                    <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Website weakness</p>
                    <p style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.5 }}>{lead.weakness_reasons[0]}</p>
                  </div>
                )}
              </div>

              {/* Move to stage */}
              <div>
                <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Move to stage</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {COLUMNS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => c.key !== card.status ? onMove(c.key) : undefined}
                      style={{
                        backgroundColor: c.key === card.status ? c.bg : '#0a1628',
                        border: `1px solid ${c.key === card.status ? c.border : '#1e293b'}`,
                        color: c.key === card.status ? c.color : '#475569',
                        borderRadius: '8px', padding: '8px',
                        fontSize: '11px', fontWeight: 700, cursor: c.key !== card.status ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                        minHeight: 'unset',
                        transition: 'all 0.15s',
                      }}
                    >
                      <ColumnIcon status={c.key} size={11} /> {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deal value */}
              <div>
                <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Deal value (EUR)</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: '14px', fontWeight: 600 }}>€</span>
                    <input
                      type="number"
                      value={valueInput}
                      onChange={(e) => setValueInput(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b',
                        borderRadius: '8px', padding: '10px 12px 10px 26px',
                        color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box' as const,
                      }}
                    />
                  </div>
                  <button
                    onClick={async () => {
                      setSaving(true);
                      await onSaveValue(valueInput ? parseInt(valueInput) : null);
                      setSaving(false);
                    }}
                    style={{
                      backgroundColor: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd',
                      borderRadius: '8px', padding: '10px 16px', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', opacity: saving ? 0.6 : 1, minHeight: 'unset',
                    }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Notes</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={async () => { if (notes !== (card.notes ?? '')) await onSaveNotes(notes); }}
                  placeholder="Add notes about this lead…"
                  style={{
                    width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b',
                    borderRadius: '8px', padding: '10px 12px', color: '#e2e8f0',
                    fontSize: '13px', resize: 'vertical', minHeight: '80px',
                    boxSizing: 'border-box' as const, lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Danger zone */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={async () => { setUnsub(true); await onUnsubscribe(); setUnsub(false); }}
                  disabled={unsub}
                  style={{
                    flex: 1, backgroundColor: '#1c0a08', border: '1px solid #78350f', color: '#fbbf24',
                    borderRadius: '8px', padding: '10px', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer', opacity: unsub ? 0.6 : 1, minHeight: 'unset',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  }}
                >
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                  </svg>
                  {unsub ? 'Unsubscribing…' : 'Unsubscribe'}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete ${lead.name}? This cannot be undone.`)) return;
                    setDeleting(true);
                    await onDelete();
                  }}
                  disabled={deleting}
                  style={{
                    flex: 1, backgroundColor: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5',
                    borderRadius: '8px', padding: '10px', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer', opacity: deleting ? 0.6 : 1, minHeight: 'unset',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  }}
                >
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                  {deleting ? 'Deleting…' : 'Delete Lead'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'emails' && (() => {
            const seqs = (card.lf_sequences ?? []).filter((s) => s.step !== 99);
            const allDoneSeq = seqs.length > 0 && seqs.every((s) => s.status !== 'pending');
            const canRestart = allDoneSeq && card.status !== 'replied';
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {seqs.length > 0
                  ? <SequenceTimeline sequences={seqs} onSendNow={onSendNow} />
                  : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#334155' }}>
                      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <p style={{ fontSize: '13px' }}>No email sequence found</p>
                    </div>
                  )
                }
                {canRestart && (
                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
                    <p style={{ color: '#334155', fontSize: '11px', marginBottom: '10px' }}>
                      Sequence complete. Restart to send a fresh 3-step campaign.
                    </p>
                    <button
                      onClick={async () => { setRestarting(true); await onRestart(); setRestarting(false); }}
                      disabled={restarting}
                      style={{
                        width: '100%', backgroundColor: restarting ? '#0a1628' : '#1e3a5f',
                        border: `1px solid ${restarting ? '#1e293b' : '#3b82f6'}`,
                        color: restarting ? '#334155' : '#93c5fd',
                        borderRadius: '8px', padding: '11px', fontSize: '13px', fontWeight: 700,
                        cursor: restarting ? 'not-allowed' : 'pointer', minHeight: 'unset',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                        transition: 'all 0.15s',
                      }}
                    >
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                      </svg>
                      {restarting ? 'Restarting…' : 'Restart Sequence'}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'send' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: '#475569', fontSize: '12px', lineHeight: 1.5 }}>
                Send a one-off message to <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{lead.email}</span>. It will be logged as a manual send and appended to notes.
              </p>
              {/* Template loader */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={async () => {
                    if (!templates) {
                      const res = await fetch('/api/templates');
                      const { templates: t } = await res.json();
                      setTemplates(t ?? []);
                    }
                    setShowTemplatePicker((p) => !p);
                  }}
                  style={{
                    background: 'none', border: '1px solid #1e293b', color: '#475569',
                    borderRadius: '7px', padding: '5px 10px', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer', minHeight: 'unset',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Load template
                </button>
                {showTemplatePicker && templates && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: '4px', zIndex: 50,
                    backgroundColor: '#040d1a', border: '1px solid #1e293b', borderRadius: '10px',
                    minWidth: '280px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                  }}>
                    {templates.length === 0 ? (
                      <div style={{ padding: '14px 16px', color: '#334155', fontSize: '12px' }}>
                        No templates yet.{' '}
                        <a href="/templates" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>Create one</a>
                      </div>
                    ) : templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setMsgSubject(t.subject);
                          setMsgBody(t.body);
                          setShowTemplatePicker(false);
                        }}
                        style={{
                          width: '100%', textAlign: 'left', background: 'none',
                          border: 'none', borderBottom: '1px solid #0f172a',
                          padding: '10px 16px', cursor: 'pointer', minHeight: 'unset',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0a1628')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <p style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 700, marginBottom: '2px' }}>{t.name}</p>
                        {t.subject && <p style={{ color: '#475569', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Subject</p>
                <input
                  type="text"
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  placeholder={`Re: ${lead.name}`}
                  style={{
                    width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b',
                    borderRadius: '8px', padding: '10px 12px', color: '#f1f5f9',
                    fontSize: '13px', boxSizing: 'border-box' as const,
                  }}
                />
              </div>
              <div>
                <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Message</p>
                <textarea
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  placeholder="Write your message…"
                  rows={10}
                  style={{
                    width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b',
                    borderRadius: '8px', padding: '10px 12px', color: '#e2e8f0',
                    fontSize: '13px', resize: 'vertical', lineHeight: 1.6,
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>
              {sendResult === 'ok' && (
                <p style={{ color: '#4ade80', fontSize: '12px', fontWeight: 700 }}>Sent successfully.</p>
              )}
              {sendResult === 'error' && (
                <p style={{ color: '#f87171', fontSize: '12px', fontWeight: 700 }}>Send failed. Check quota or email address.</p>
              )}
              <button
                disabled={sending || !msgSubject.trim() || !msgBody.trim()}
                onClick={async () => {
                  setSending(true);
                  setSendResult(null);
                  const res = await fetch('/api/crm/send-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cardId: card.id, subject: msgSubject, body: msgBody }),
                  });
                  setSending(false);
                  if (res.ok) {
                    setSendResult('ok');
                    setMsgSubject('');
                    setMsgBody('');
                  } else {
                    setSendResult('error');
                  }
                }}
                style={{
                  backgroundColor: sending || !msgSubject.trim() || !msgBody.trim() ? '#0a1628' : '#1e3a5f',
                  border: `1px solid ${sending || !msgSubject.trim() || !msgBody.trim() ? '#1e293b' : '#3b82f6'}`,
                  color: sending || !msgSubject.trim() || !msgBody.trim() ? '#334155' : '#93c5fd',
                  borderRadius: '8px', padding: '11px', fontSize: '13px', fontWeight: 700,
                  cursor: sending || !msgSubject.trim() || !msgBody.trim() ? 'not-allowed' : 'pointer',
                  minHeight: 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          )}

          {activeTab === 'proposal' && (
            <ProposalBuilder lead={lead} valueEur={card.value_eur} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Proposal Builder ─────────────────────────────────────────────────────────

function ProposalBuilder({ lead, valueEur }: { lead: LeadRow; valueEur: number | null }) {
  const [price, setPrice] = useState(valueEur?.toString() ?? '2500');
  const [copied, setCopied] = useState(false);

  const issues = lead.weakness_reasons ?? [];
  const hasWebsite = !!lead.website;

  const lines: string[] = [];
  lines.push(`PROPOSAL — ${lead.name}`);
  lines.push(`Prepared by: Omar Rageh · omar@omarrageh.de · +49 176 55093674`);
  lines.push(`Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  lines.push('');
  lines.push('─────────────────────────────────────────────');
  lines.push('SCOPE OF WORK');
  lines.push('─────────────────────────────────────────────');

  if (!hasWebsite) {
    lines.push('• New website — full design & development (Next.js)');
    lines.push('• Mobile-first, responsive layout');
    lines.push('• Basic SEO setup (meta tags, sitemap, robots.txt)');
    lines.push('• Contact form with email notifications');
    lines.push('• Hosting setup & domain configuration');
    lines.push('• 1 round of revisions');
  } else {
    lines.push('• Website redesign / rebuild (Next.js)');
    if (issues.some((r) => r.toLowerCase().includes('mobil') || r.toLowerCase().includes('viewport') || r.toLowerCase().includes('mobile'))) {
      lines.push('• Mobile optimization — fully responsive on all devices');
    }
    if (issues.some((r) => r.toLowerCase().includes('wix') || r.toLowerCase().includes('wordpress') || r.toLowerCase().includes('baukasten') || r.toLowerCase().includes('builder'))) {
      lines.push('• Migration away from page builder (Wix/WordPress/IONOS) to custom code');
    }
    if (issues.some((r) => r.toLowerCase().includes('https') || r.toLowerCase().includes('ssl'))) {
      lines.push('• SSL certificate installation & HTTPS redirect');
    }
    lines.push('• Performance optimization (Core Web Vitals)');
    lines.push('• SEO improvements — meta tags, structured data, sitemap');
    lines.push('• 1 round of revisions');
  }

  lines.push('');
  if (issues.length > 0) {
    lines.push('─────────────────────────────────────────────');
    lines.push('WHY THIS MATTERS (IDENTIFIED ISSUES)');
    lines.push('─────────────────────────────────────────────');
    issues.forEach((r) => lines.push(`• ${r}`));
    lines.push('');
  }

  lines.push('─────────────────────────────────────────────');
  lines.push('INVESTMENT');
  lines.push('─────────────────────────────────────────────');
  lines.push(`One-off fixed price: €${parseInt(price || '0').toLocaleString()}`);
  lines.push('No monthly fees. No hidden costs.');
  lines.push('50% upfront · 50% on delivery.');
  lines.push('');
  lines.push('─────────────────────────────────────────────');
  lines.push('TIMELINE');
  lines.push('─────────────────────────────────────────────');
  lines.push('Estimated delivery: 5–7 business days from deposit.');
  lines.push('');
  lines.push('─────────────────────────────────────────────');
  lines.push('NEXT STEP');
  lines.push('─────────────────────────────────────────────');
  lines.push('Reply to this proposal or book a 15-min call:');
  if (process.env.NEXT_PUBLIC_CALENDLY_URL) {
    lines.push(process.env.NEXT_PUBLIC_CALENDLY_URL);
  }
  lines.push('');
  lines.push('Omar Rageh · Full-Stack Developer · Fulda, Germany');
  lines.push('omar@omarrageh.de · +49 176 55093674 · omar-portfolio.xyz');

  const text = lines.join('\n');

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Project Price (EUR)</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: '14px', fontWeight: 600 }}>€</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{
                width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b',
                borderRadius: '8px', padding: '10px 12px 10px 26px',
                color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box' as const,
              }}
            />
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Proposal Text</p>
          <button
            onClick={copy}
            style={{
              backgroundColor: copied ? '#052e16' : '#0a1628',
              border: `1px solid ${copied ? '#166534' : '#1e293b'}`,
              color: copied ? '#4ade80' : '#475569',
              borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700,
              cursor: 'pointer', minHeight: 'unset',
              display: 'flex', alignItems: 'center', gap: '4px',
              transition: 'all 0.15s',
            }}
          >
            {copied ? (
              <>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Copied
              </>
            ) : (
              <>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
        <pre style={{
          backgroundColor: '#050d1a', border: '1px solid #0f172a', borderRadius: '10px',
          padding: '14px', color: '#64748b', fontSize: '11px', lineHeight: 1.7,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
          maxHeight: '420px', overflowY: 'auto', fontFamily: 'monospace',
        }}>
          {text}
        </pre>
      </div>
    </div>
  );
}

// ─── CSV Import Modal ─────────────────────────────────────────────────────────

function parseCSV(text: string): { name: string; email: string; website?: string; country?: string; phone?: string }[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
  const idx = { name: header.indexOf('name'), email: header.indexOf('email'), website: header.indexOf('website'), country: header.indexOf('country'), phone: header.indexOf('phone') };
  if (idx.name === -1 || idx.email === -1) return [];
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    return {
      name: cols[idx.name] ?? '',
      email: cols[idx.email] ?? '',
      website: idx.website >= 0 ? (cols[idx.website] || undefined) : undefined,
      country: idx.country >= 0 ? (cols[idx.country] || undefined) : undefined,
      phone: idx.phone >= 0 ? (cols[idx.phone] || undefined) : undefined,
    };
  }).filter((r) => r.name && r.email);
}

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof parseCSV>>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const handleParse = (text: string) => {
    setCsvText(text);
    setPreview(parseCSV(text));
    setResult(null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleParse(ev.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    const res = await fetch('/api/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: preview }),
    });
    const data = await res.json();
    setImporting(false);
    if (res.ok) {
      setResult(data);
      onImported();
    } else {
      setResult({ imported: 0, skipped: preview.length, errors: [data.error ?? 'Import failed'] });
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#040d1a', border: '1px solid #1e293b',
          borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '560px',
          maxHeight: '90vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '18px',
          animation: 'fadeInUp 0.2s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: 800 }}>Import Leads from CSV</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid #1e293b', color: '#475569', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 'unset' }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ backgroundColor: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '12px' }}>
          <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Required columns (header row):</p>
          <code style={{ color: '#60a5fa', fontSize: '11px', fontFamily: 'monospace' }}>name, email, website, country, phone</code>
          <p style={{ color: '#334155', fontSize: '10px', marginTop: '4px' }}>Only name + email are required. Country defaults to <code style={{ color: '#64748b' }}>de</code>.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', backgroundColor: '#0a1628', border: '2px dashed #1e3a5f', borderRadius: '10px', padding: '14px', justifyContent: 'center' }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style={{ color: '#60a5fa', fontSize: '13px', fontWeight: 700 }}>Choose CSV file</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          <p style={{ color: '#334155', fontSize: '11px', textAlign: 'center' }}>or paste CSV below</p>
          <textarea
            value={csvText}
            onChange={(e) => handleParse(e.target.value)}
            placeholder={'name,email,website,country\nAcme GmbH,info@acme.de,https://acme.de,de'}
            rows={5}
            style={{
              width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b',
              borderRadius: '8px', padding: '10px 12px', color: '#e2e8f0',
              fontSize: '12px', fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.5,
              boxSizing: 'border-box' as const,
            }}
          />
        </div>

        {preview.length > 0 && !result && (
          <div>
            <p style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Preview — {preview.length} row{preview.length !== 1 ? 's' : ''} parsed
            </p>
            <div style={{ backgroundColor: '#050d1a', border: '1px solid #0f172a', borderRadius: '10px', overflow: 'hidden' }}>
              {preview.slice(0, 5).map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderBottom: i < Math.min(4, preview.length - 1) ? '1px solid #0f172a' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</p>
                    <p style={{ color: '#475569', fontSize: '10px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.email}</p>
                  </div>
                  {row.country && (
                    <span style={{ color: '#334155', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>{row.country}</span>
                  )}
                </div>
              ))}
              {preview.length > 5 && (
                <div style={{ padding: '8px 12px', color: '#334155', fontSize: '11px' }}>+{preview.length - 5} more rows…</div>
              )}
            </div>
          </div>
        )}

        {result && (
          <div style={{
            backgroundColor: result.imported > 0 ? '#052e16' : '#450a0a',
            border: `1px solid ${result.imported > 0 ? '#166534' : '#7f1d1d'}`,
            borderRadius: '10px', padding: '12px',
          }}>
            <p style={{ color: result.imported > 0 ? '#4ade80' : '#fca5a5', fontSize: '13px', fontWeight: 800, marginBottom: '4px' }}>
              {result.imported} imported, {result.skipped} skipped
            </p>
            {result.errors.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
                {result.errors.map((e, i) => (
                  <p key={i} style={{ color: '#f87171', fontSize: '11px', fontFamily: 'monospace' }}>{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {!result && (
          <button
            onClick={handleImport}
            disabled={importing || preview.length === 0}
            style={{
              backgroundColor: importing || preview.length === 0 ? '#0a1628' : '#1e3a5f',
              border: `1px solid ${importing || preview.length === 0 ? '#1e293b' : '#3b82f6'}`,
              color: importing || preview.length === 0 ? '#334155' : '#93c5fd',
              borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700,
              cursor: importing || preview.length === 0 ? 'not-allowed' : 'pointer',
              minHeight: 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              transition: 'all 0.15s',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {importing ? `Importing ${preview.length} leads…` : preview.length > 0 ? `Import ${preview.length} lead${preview.length !== 1 ? 's' : ''}` : 'Import'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── List View Row ────────────────────────────────────────────────────────────

function ListRow({ card, selected, onSelect, onToggle }: {
  card: CrmCard;
  selected: boolean;
  onSelect: () => void;
  onToggle: (e: React.MouseEvent) => void;
}) {
  const lead = card.lf_leads;
  const col = COLUMNS.find((c) => c.key === card.status)!;
  const nextSeq = nextPendingSeq(card.lf_sequences ?? []);
  const fu = nextSeq ? followUpLabel(nextSeq) : null;

  return (
    <tr
      onClick={onSelect}
      style={{ borderBottom: '1px solid #0a1628', cursor: 'pointer', transition: 'background 0.1s', backgroundColor: selected ? 'rgba(59,130,246,0.06)' : 'transparent' }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = '#0a1628'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selected ? 'rgba(59,130,246,0.06)' : 'transparent'; }}
    >
      <td style={{ padding: '12px 16px', width: '36px' }} onClick={(e) => e.stopPropagation()}>
        <div
          onClick={onToggle}
          style={{
            width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0,
            backgroundColor: selected ? '#3b82f6' : '#0a1628',
            border: `1px solid ${selected ? '#3b82f6' : '#1e3a5f'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {selected && (
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <p style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 700, lineHeight: 1.3, marginBottom: '2px' }}>{lead.name}</p>
        {lead.email && (
          <p style={{ color: '#475569', fontSize: '11px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
            {lead.email}
          </p>
        )}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{
          backgroundColor: col.bg, border: `1px solid ${col.border}`, color: col.color,
          borderRadius: '999px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
        }}>
          <ColumnIcon status={col.key} size={10} /> {col.label}
        </span>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{
          backgroundColor: scoreBg(lead.weakness_score),
          border: `1px solid ${scoreBorder(lead.weakness_score)}`,
          color: scoreColor(lead.weakness_score),
          borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700,
        }}>
          {lead.weakness_score}/10 {scoreLabel(lead.weakness_score)}
        </span>
      </td>
      <td style={{ padding: '12px 16px' }}>
        {fu ? (
          <span style={{
            color: fu.urgent ? '#fca5a5' : fu.future ? '#475569' : '#fbbf24',
            fontSize: '12px', fontWeight: 600,
          }}>
            {fu.label}
          </span>
        ) : (
          <span style={{ color: '#1e293b', fontSize: '12px' }}>—</span>
        )}
      </td>
      <td style={{ padding: '12px 16px' }}>
        {card.value_eur ? (
          <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: 700 }}>€{card.value_eur.toLocaleString()}</span>
        ) : (
          <span style={{ color: '#1e293b', fontSize: '13px' }}>—</span>
        )}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{ color: '#334155', fontSize: '11px' }}>{timeAgo(card.created_at)}</span>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface CampaignStats {
  sent: number; opened: number; replied: number;
  openRate: number; replyRate: number;
  byStep: { step: number; sent: number; opened: number; replied: number; openRate: number; replyRate: number }[];
}

export default function CrmPage() {
  const [cards, setCards] = useState<CrmCard[]>([]);
  const [warmup, setWarmup] = useState<WarmupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<CrmCard | null>(null);
  const [dragOverCol, setDragOverCol] = useState<CardStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'stats'>('kanban');
  const [filterStatus, setFilterStatus] = useState<CardStatus | 'all'>('all');
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    const [cardsRes, warmupRes] = await Promise.all([
      fetch('/api/crm/cards'),
      fetch('/api/warmup/status'),
    ]);
    const { cards: c } = await cardsRes.json();
    const w = await warmupRes.json();
    setCards(c ?? []);
    setWarmup(w);
    setLoading(false);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch('/api/crm/stats');
    const data = await res.json();
    setCampaignStats(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedCard) {
      const updated = cards.find((c) => c.id === selectedCard.id);
      if (updated) setSelectedCard(updated);
    }
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ──────────────────────────────────────────────────────────────────

  const moveCard = async (cardId: string, status: CardStatus) => {
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, status } : c));
    if (selectedCard?.id === cardId) setSelectedCard((p) => p ? { ...p, status } : null);
    await fetch('/api/crm/move', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId, status }) });
  };

  const saveNotes = async (cardId: string, notes: string) => {
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, notes } : c));
    await fetch('/api/crm/move', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId, notes }) });
  };

  const saveValue = async (cardId: string, valueEur: number | null) => {
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, value_eur: valueEur } : c));
    if (selectedCard?.id === cardId) setSelectedCard((p) => p ? { ...p, value_eur: valueEur } : null);
    await fetch('/api/crm/move', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId, valueEur }) });
  };

  const deleteCard = async (cardId: string) => {
    await fetch('/api/crm/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId }) });
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setSelectedCard(null);
  };

  const unsubscribe = async (cardId: string) => {
    await fetch('/api/crm/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId }) });
    await load();
    setSelectedCard(null);
  };

  const sendNow = async (seq: SequenceRow) => {
    const res = await fetch('/api/sequences/send-now', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sequenceId: seq.id }) });
    if (res.ok) await load();
    else { const d = await res.json(); alert(d.error ?? 'Send failed'); }
  };

  const restartSequence = async (cardId: string) => {
    const res = await fetch('/api/crm/restart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId }) });
    if (res.ok) await load();
    else { const d = await res.json(); alert(d.error ?? 'Restart failed'); }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkMove = async (status: CardStatus) => {
    const ids = [...selectedIds];
    setCards((prev) => prev.map((c) => ids.includes(c.id) ? { ...c, status } : c));
    setSelectedIds(new Set());
    await Promise.all(ids.map((id) =>
      fetch('/api/crm/move', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId: id, status }) })
    ));
  };

  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (!confirm(`Delete ${ids.length} lead${ids.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    setCards((prev) => prev.filter((c) => !ids.includes(c.id)));
    setSelectedIds(new Set());
    if (selectedCard && ids.includes(selectedCard.id)) setSelectedCard(null);
    await Promise.all(ids.map((id) =>
      fetch('/api/crm/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId: id }) })
    ));
  };

  // ── Drag-and-drop ─────────────────────────────────────────────────────────

  const onDrop = (col: CardStatus) => {
    if (draggingId) moveCard(draggingId, col);
    setDragOverCol(null);
    setDraggingId(null);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const active = cards.filter((c) => !['won', 'lost'].includes(c.status));
  const won = cards.filter((c) => c.status === 'won');
  const pipelineValue = active.reduce((s, c) => s + (c.value_eur ?? 0), 0);
  const wonValue = won.reduce((s, c) => s + (c.value_eur ?? 0), 0);
  const dueToday = cards.filter((c) => {
    const next = nextPendingSeq(c.lf_sequences ?? []);
    return next ? new Date(next.scheduled_for) <= new Date() : false;
  }).length;
  const conversionRate = cards.length > 0 ? Math.round((won.length / cards.length) * 100) : 0;

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filtered = cards.filter((c) => {
    const matchSearch = !search.trim() ||
      c.lf_leads.name.toLowerCase().includes(search.toLowerCase()) ||
      c.lf_leads.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#020609', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          <p style={{ color: '#475569', fontSize: '14px' }}>Loading CRM…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#020609', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid #0a1628',
        backgroundColor: 'rgba(2,6,9,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{
            color: '#475569', fontSize: '12px', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', minHeight: 'unset',
          }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Search
          </Link>
          <span style={{ color: '#1e293b', fontSize: '16px' }}>|</span>
          <h1 style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: 800, whiteSpace: 'nowrap' }}>CRM Pipeline</h1>
          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: '240px', width: '100%' }}>
            <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              style={{
                width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b',
                borderRadius: '8px', padding: '7px 10px 7px 30px',
                color: '#e2e8f0', fontSize: '13px', boxSizing: 'border-box' as const,
              }}
            />
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', backgroundColor: '#0a1628', border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            {([
              { key: 'kanban', title: 'Kanban view', icon: <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="11" y="3" width="5" height="14" rx="1"/><rect x="19" y="3" width="2" height="10" rx="1"/></svg> },
              { key: 'list',   title: 'List view',   icon: <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
              { key: 'stats',  title: 'Campaign stats', icon: <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
            ] as const).map((v, i, arr) => (
              <button
                key={v.key}
                onClick={() => { setViewMode(v.key); if (v.key === 'stats') loadStats(); }}
                title={v.title}
                style={{
                  padding: '7px 10px', cursor: 'pointer', minHeight: 'unset',
                  background: viewMode === v.key ? '#1e3a5f' : 'none',
                  border: 'none', color: viewMode === v.key ? '#93c5fd' : '#475569',
                  display: 'flex', alignItems: 'center',
                  borderRight: i < arr.length - 1 ? '1px solid #1e293b' : 'none',
                }}
              >
                {v.icon}
              </button>
            ))}
          </div>

          <Link
            href="/templates"
            title="Email Templates"
            style={{
              background: 'none', border: '1px solid #1e293b', color: '#475569',
              borderRadius: '8px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer', minHeight: 'unset',
              display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none',
            }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Templates
          </Link>

          <button
            onClick={() => setShowImport(true)}
            title="Import CSV"
            style={{
              background: 'none', border: '1px solid #1e3a5f', color: '#60a5fa',
              borderRadius: '8px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer', minHeight: 'unset',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import
          </button>

          <button onClick={load} style={{
            background: 'none', border: '1px solid #1e293b', color: '#475569',
            borderRadius: '8px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer', minHeight: 'unset',
          }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%', padding: '20px 20px 60px' }}>

        {/* ── Stats bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          {[
            {
              label: 'Total Leads', value: String(cards.length),
              sub: `${active.length} active`, color: '#f1f5f9',
              icon: (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              ),
            },
            {
              label: 'Pipeline', value: pipelineValue > 0 ? `€${pipelineValue.toLocaleString()}` : '—',
              sub: 'active stages', color: '#60a5fa',
              icon: (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              ),
            },
            {
              label: 'Won', value: wonValue > 0 ? `€${wonValue.toLocaleString()}` : '—',
              sub: `${won.length} deals closed`, color: '#4ade80',
              icon: (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ),
            },
            {
              label: 'Conversion', value: `${conversionRate}%`,
              sub: `${won.length} won · ${cards.filter((c) => c.status === 'lost').length} lost`,
              color: conversionRate > 10 ? '#4ade80' : '#f59e0b',
              icon: (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={conversionRate > 10 ? '#4ade80' : '#f59e0b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              ),
            },
            {
              label: 'Follow-ups Due', value: String(dueToday),
              sub: 'overdue or due today', color: dueToday > 0 ? '#f87171' : '#4ade80',
              icon: (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={dueToday > 0 ? '#f87171' : '#4ade80'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              ),
            },
          ].map((s) => (
            <div key={s.label} style={{
              backgroundColor: '#06101f', border: '1px solid #0f1f36',
              borderRadius: '12px', padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: '#0a1628', border: '1px solid #1e293b', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <p style={{ color: '#334155', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{s.label}</p>
                <p style={{ color: s.color, fontSize: '18px', fontWeight: 800, lineHeight: 1 }}>{s.value}</p>
                <p style={{ color: '#334155', fontSize: '10px', marginTop: '2px' }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Status filter tabs + warmup ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {/* Status pills */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterStatus('all')}
              style={{
                backgroundColor: filterStatus === 'all' ? '#1e3a5f' : 'transparent',
                border: `1px solid ${filterStatus === 'all' ? '#3b82f6' : '#1e293b'}`,
                color: filterStatus === 'all' ? '#93c5fd' : '#475569',
                borderRadius: '999px', padding: '5px 12px', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', minHeight: 'unset',
              }}
            >
              All ({cards.length})
            </button>
            {COLUMNS.map((col) => {
              const count = cards.filter((c) => c.status === col.key).length;
              const active = filterStatus === col.key;
              return (
                <button
                  key={col.key}
                  onClick={() => setFilterStatus(active ? 'all' : col.key)}
                  style={{
                    backgroundColor: active ? col.bg : 'transparent',
                    border: `1px solid ${active ? col.border : '#1e293b'}`,
                    color: active ? col.color : '#475569',
                    borderRadius: '999px', padding: '5px 12px', fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer', minHeight: 'unset',
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  <ColumnIcon status={col.key} size={10} />
                  {col.label} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          {/* Warm-up pill */}
          {warmup && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              backgroundColor: '#06101f', border: '1px solid #0f1f36',
              borderRadius: '999px', padding: '6px 14px',
            }}>
              <div style={{ width: '80px', height: '4px', backgroundColor: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((warmup.count / warmup.limit) * 100, 100)}%`,
                  backgroundColor: warmup.ok ? '#3b82f6' : '#ef4444',
                  borderRadius: '999px',
                }} />
              </div>
              <span style={{ color: warmup.ok ? '#60a5fa' : '#f87171', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {warmup.count}/{warmup.limit} today · Wk {warmup.week}
              </span>
              {!warmup.ok && (
                <span style={{ color: '#fca5a5', fontSize: '10px', fontWeight: 700 }}>LIMIT</span>
              )}
            </div>
          )}
        </div>

        {/* ── Empty state ── */}
        {cards.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#334155' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: '#0a1628', border: '1px solid #1e293b', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>No leads in CRM yet</p>
            <p style={{ fontSize: '14px', marginBottom: '24px' }}>Go to search and click <strong style={{ color: '#60a5fa' }}>Add to CRM &amp; Send</strong> on a lead.</p>
            <Link href="/" style={{
              backgroundColor: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd',
              borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: 700,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Go to Search
            </Link>
          </div>
        )}

        {/* ── List view ── */}
        {viewMode === 'list' && filtered.length > 0 && (
          <div style={{ backgroundColor: '#06101f', border: '1px solid #0f1f36', borderRadius: '14px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' as const }}>
              <colgroup>
                <col style={{ width: '36px' }} /><col style={{ width: '260px' }} /><col style={{ width: '140px' }} />
                <col style={{ width: '120px' }} /><col style={{ width: '180px' }} />
                <col style={{ width: '100px' }} /><col style={{ width: '100px' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#040d1a', borderBottom: '1px solid #0a1628' }}>
                  <th style={{ padding: '10px 16px' }} />
                  {['Lead', 'Stage', 'Score', 'Follow-up', 'Value', 'Added'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '10px 16px',
                      fontSize: '10px', fontWeight: 700, color: '#334155',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((card) => (
                  <ListRow key={card.id} card={card} selected={selectedIds.has(card.id)} onSelect={() => setSelectedCard(card)} onToggle={(e) => toggleSelect(card.id, e)} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Kanban view ── */}
        {viewMode === 'kanban' && cards.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(220px, 1fr))', gap: '10px', overflowX: 'auto', minHeight: '60vh' }}>
            {COLUMNS.map((col) => {
              const colCards = filtered.filter((c) => c.status === col.key);
              const colValue = colCards.reduce((s, c) => s + (c.value_eur ?? 0), 0);
              const isOver = dragOverCol === col.key;

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
                  onDrop={() => onDrop(col.key)}
                  onDragLeave={() => setDragOverCol(null)}
                  style={{
                    backgroundColor: isOver ? col.bg : '#04080f',
                    border: `1px solid ${isOver ? col.border : '#0d1929'}`,
                    borderRadius: '14px', padding: '12px',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {/* Column header */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{
                        color: col.color, fontSize: '11px', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        display: 'flex', alignItems: 'center', gap: '5px',
                      }}>
                        <ColumnIcon status={col.key} size={11} /> {col.label}
                      </span>
                      <span style={{
                        backgroundColor: col.bg, border: `1px solid ${col.border}`,
                        color: col.color, borderRadius: '999px',
                        padding: '1px 8px', fontSize: '11px', fontWeight: 800,
                      }}>
                        {colCards.length}
                      </span>
                    </div>
                    {colValue > 0 && (
                      <p style={{ color: '#334155', fontSize: '10px', fontWeight: 600 }}>€{colValue.toLocaleString()}</p>
                    )}
                  </div>

                  {/* Drop zone divider */}
                  {isOver && (
                    <div style={{ height: '2px', backgroundColor: col.accent, borderRadius: '999px', marginBottom: '10px' }} />
                  )}

                  {/* Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {colCards.map((card) => {
                      const lead = card.lf_leads;
                      const nextSeq = nextPendingSeq(card.lf_sequences ?? []);
                      const fu = nextSeq ? followUpLabel(nextSeq) : null;
                      const allDone = (card.lf_sequences ?? []).length > 0 &&
                        (card.lf_sequences ?? []).every((s) => s.status !== 'pending');

                      return (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={() => setDraggingId(card.id)}
                          onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                          onClick={() => setSelectedCard(card)}
                          style={{
                            backgroundColor: '#07111f',
                            border: `1px solid ${fu?.urgent ? '#7f1d1d' : '#122033'}`,
                            borderRadius: '12px', padding: '12px',
                            cursor: 'pointer',
                            opacity: draggingId === card.id ? 0.35 : 1,
                            transition: 'opacity 0.15s, border-color 0.15s, transform 0.1s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = col.border; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = fu?.urgent ? '#7f1d1d' : '#122033'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          {/* Score badge + name */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '6px' }}>
                            <div
                              onClick={(e) => toggleSelect(card.id, e)}
                              style={{
                                width: '14px', height: '14px', marginTop: '2px', flexShrink: 0, borderRadius: '3px', cursor: 'pointer',
                                backgroundColor: selectedIds.has(card.id) ? '#3b82f6' : '#0d1929',
                                border: `1px solid ${selectedIds.has(card.id) ? '#3b82f6' : '#1e3a5f'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              {selectedIds.has(card.id) && (
                                <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </div>
                            <p style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 700, lineHeight: 1.3, flex: 1, minWidth: 0 }}>
                              {lead.name}
                            </p>
                            <span style={{
                              backgroundColor: scoreBg(lead.weakness_score),
                              border: `1px solid ${scoreBorder(lead.weakness_score)}`,
                              color: scoreColor(lead.weakness_score),
                              borderRadius: '6px', padding: '1px 6px',
                              fontSize: '10px', fontWeight: 800, flexShrink: 0,
                              whiteSpace: 'nowrap',
                            }}>
                              {lead.weakness_score}/10
                            </span>
                          </div>

                          {/* Email */}
                          {lead.email && (
                            <p style={{ color: '#334155', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}>
                              {lead.email}
                            </p>
                          )}

                          {/* Follow-up or done badge */}
                          {fu ? (
                            <div style={{
                              backgroundColor: fu.urgent ? '#450a0a' : fu.future ? '#080f1e' : '#1c1208',
                              border: `1px solid ${fu.urgent ? '#7f1d1d' : fu.future ? '#1e293b' : '#78350f'}`,
                              borderRadius: '6px', padding: '3px 8px', marginBottom: '8px',
                              fontSize: '10px', fontWeight: 700,
                              color: fu.urgent ? '#fca5a5' : fu.future ? '#334155' : '#fbbf24',
                              display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                              {fu.urgent && (
                                <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                              )}
                              {fu.label}
                            </div>
                          ) : allDone ? (
                            <div style={{ fontSize: '10px', color: '#166534', marginBottom: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              Sequence complete
                            </div>
                          ) : null}

                          {/* Value + notes + open indicator + variant */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {card.value_eur && (
                                <span style={{ color: '#4ade80', fontSize: '11px', fontWeight: 700 }}>€{card.value_eur.toLocaleString()}</span>
                              )}
                              {(card.lf_sequences ?? []).some((s) => s.opened_at) && (
                                <span title="Email opened" style={{ color: '#4ade80' }}>
                                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                  </svg>
                                </span>
                              )}
                              {card.notes && (
                                <span title={card.notes} style={{ color: '#334155' }}>
                                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                                  </svg>
                                </span>
                              )}
                              <span
                                title={`Pitch variant ${pitchVariant(lead.name)}`}
                                style={{
                                  backgroundColor: '#0a1628', border: '1px solid #1e293b',
                                  color: '#334155', borderRadius: '4px',
                                  padding: '0px 4px', fontSize: '9px', fontWeight: 800, fontFamily: 'monospace',
                                }}
                              >
                                V{pitchVariant(lead.name)}
                              </span>
                            </div>
                            <span style={{ color: '#1e293b', fontSize: '10px' }}>{timeAgo(card.created_at)}</span>
                          </div>
                        </div>
                      );
                    })}

                    {colCards.length === 0 && (
                      <div style={{
                        color: '#0d1929', fontSize: '11px', textAlign: 'center',
                        padding: '32px 16px', userSelect: 'none',
                        border: `2px dashed ${isOver ? col.border : 'transparent'}`,
                        borderRadius: '10px', transition: 'border-color 0.15s',
                      }}>
                        {isOver ? 'Drop here' : 'Empty'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Stats view ── */}
        {viewMode === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {!campaignStats ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              </div>
            ) : (
              <>
                {/* Top-line metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                  {[
                    { label: 'Emails Sent', value: String(campaignStats.sent), color: '#93c5fd', icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
                    { label: 'Open Rate', value: `${campaignStats.openRate}%`, color: campaignStats.openRate >= 30 ? '#4ade80' : campaignStats.openRate >= 15 ? '#fbbf24' : '#f87171', icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> },
                    { label: 'Reply Rate', value: `${campaignStats.replyRate}%`, color: campaignStats.replyRate >= 5 ? '#4ade80' : campaignStats.replyRate >= 2 ? '#fbbf24' : '#f87171', icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
                    { label: 'Opened', value: String(campaignStats.opened), color: '#4ade80', icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
                    { label: 'Replied', value: String(campaignStats.replied), color: '#a78bfa', icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/></svg> },
                  ].map((s) => (
                    <div key={s.label} style={{ backgroundColor: '#06101f', border: '1px solid #0f1f36', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', backgroundColor: '#0a1628', border: '1px solid #1e293b', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
                      <div>
                        <p style={{ color: '#334155', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{s.label}</p>
                        <p style={{ color: s.color, fontSize: '20px', fontWeight: 800, lineHeight: 1 }}>{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Per-step breakdown */}
                {campaignStats.byStep.length > 0 && (
                  <div style={{ backgroundColor: '#06101f', border: '1px solid #0f1f36', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #0f1f36' }}>
                      <p style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 800 }}>Performance by Step</p>
                      <p style={{ color: '#334155', fontSize: '11px', marginTop: '2px' }}>Which email in the sequence gets the best response</p>
                    </div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {campaignStats.byStep.map((s) => (
                        <div key={s.step}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700 }}>
                              Step {s.step} — {s.sent} sent
                            </span>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 700 }}>{s.openRate}% open</span>
                              <span style={{ color: '#a78bfa', fontSize: '12px', fontWeight: 700 }}>{s.replyRate}% reply</span>
                            </div>
                          </div>
                          {/* Open rate bar */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#334155', fontSize: '10px', width: '36px', flexShrink: 0 }}>Open</span>
                              <div style={{ flex: 1, height: '6px', backgroundColor: '#0a1628', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${s.openRate}%`, backgroundColor: '#3b82f6', borderRadius: '999px', transition: 'width 0.5s ease' }} />
                              </div>
                              <span style={{ color: '#60a5fa', fontSize: '11px', fontWeight: 700, width: '32px', textAlign: 'right' }}>{s.opened}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#334155', fontSize: '10px', width: '36px', flexShrink: 0 }}>Reply</span>
                              <div style={{ flex: 1, height: '6px', backgroundColor: '#0a1628', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${s.replyRate}%`, backgroundColor: '#8b5cf6', borderRadius: '999px', transition: 'width 0.5s ease' }} />
                              </div>
                              <span style={{ color: '#a78bfa', fontSize: '11px', fontWeight: 700, width: '32px', textAlign: 'right' }}>{s.replied}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Benchmarks */}
                <div style={{ backgroundColor: '#06101f', border: '1px solid #0f1f36', borderRadius: '14px', padding: '16px 20px' }}>
                  <p style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Cold Email Benchmarks</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'Open Rate', good: '≥ 30%', avg: '15–29%', bad: '< 15%' },
                      { label: 'Reply Rate', good: '≥ 5%', avg: '2–4%', bad: '< 2%' },
                      { label: 'Meeting Rate', good: '≥ 2%', avg: '0.5–1%', bad: '< 0.5%' },
                    ].map((b) => (
                      <div key={b.label} style={{ backgroundColor: '#0a1628', borderRadius: '10px', padding: '12px' }}>
                        <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, marginBottom: '6px' }}>{b.label}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#4ade80', fontSize: '11px' }}>Good</span><span style={{ color: '#4ade80', fontSize: '11px', fontWeight: 700 }}>{b.good}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#fbbf24', fontSize: '11px' }}>Avg</span><span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 700 }}>{b.avg}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#f87171', fontSize: '11px' }}>Poor</span><span style={{ color: '#f87171', fontSize: '11px', fontWeight: 700 }}>{b.bad}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Import modal ── */}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImported={() => { load(); setShowImport(false); }} />
      )}

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, backgroundColor: '#040d1a', border: '1px solid #3b82f6',
          borderRadius: '14px', padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          animation: 'slideInUp 0.2s ease-out',
          flexWrap: 'wrap',
        }}>
          <span style={{ color: '#93c5fd', fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {selectedIds.size} selected
          </span>
          <div style={{ width: '1px', height: '16px', backgroundColor: '#1e293b' }} />
          <span style={{ color: '#475569', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>Move to:</span>
          {COLUMNS.map((c) => (
            <button
              key={c.key}
              onClick={() => bulkMove(c.key)}
              style={{
                backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.color,
                borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700,
                cursor: 'pointer', minHeight: 'unset',
                display: 'flex', alignItems: 'center', gap: '3px',
              }}
            >
              <ColumnIcon status={c.key} size={9} /> {c.label}
            </button>
          ))}
          <div style={{ width: '1px', height: '16px', backgroundColor: '#1e293b' }} />
          <button
            onClick={bulkDelete}
            style={{
              backgroundColor: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5',
              borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700,
              cursor: 'pointer', minHeight: 'unset',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              background: 'none', border: '1px solid #1e293b', color: '#475569',
              borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 700,
              cursor: 'pointer', minHeight: 'unset',
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Detail drawer ── */}
      {selectedCard && (
        <DetailDrawer
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onMove={async (status) => { await moveCard(selectedCard.id, status); }}
          onDelete={() => deleteCard(selectedCard.id)}
          onUnsubscribe={() => unsubscribe(selectedCard.id)}
          onSendNow={sendNow}
          onSaveNotes={(notes) => saveNotes(selectedCard.id, notes)}
          onSaveValue={(v) => saveValue(selectedCard.id, v)}
          onRestart={() => restartSequence(selectedCard.id)}
        />
      )}
    </div>
  );
}
