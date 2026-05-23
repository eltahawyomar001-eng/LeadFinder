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

const COLUMNS: { key: CardStatus; label: string; emoji: string; color: string; bg: string; border: string }[] = [
  { key: 'contacted', label: 'Contacted',     emoji: '📤', color: '#93c5fd', bg: '#0c1a2e', border: '#1e3a5f' },
  { key: 'replied',   label: 'Replied',        emoji: '💬', color: '#fbbf24', bg: '#1c1208', border: '#78350f' },
  { key: 'meeting',   label: 'Meeting',        emoji: '📅', color: '#a78bfa', bg: '#12082a', border: '#4c1d95' },
  { key: 'proposal',  label: 'Proposal',       emoji: '📄', color: '#f472b6', bg: '#1f0a18', border: '#831843' },
  { key: 'won',       label: 'Won',            emoji: '✅', color: '#4ade80', bg: '#052e16', border: '#166534' },
  { key: 'lost',      label: 'Lost',           emoji: '❌', color: '#64748b', bg: '#0f172a', border: '#1e293b' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return 'just now';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
    ? `Follow-up #${seq.step} overdue`
    : days === 1
    ? `Follow-up #${seq.step} — tomorrow`
    : `Follow-up #${seq.step} — in ${days}d`;
  return { label, urgent, future };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ backgroundColor: '#0a1628', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px 20px', flex: 1, minWidth: '140px' }}>
      <p style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</p>
      <p style={{ color: color ?? '#f1f5f9', fontSize: '24px', fontWeight: 800, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ color: '#334155', fontSize: '11px', marginTop: '4px' }}>{sub}</p>}
    </div>
  );
}

function SequenceTimeline({ sequences, onSendNow }: { sequences: SequenceRow[]; onSendNow: (seq: SequenceRow) => Promise<void> }) {
  const [sendingId, setSendingId] = useState<string | null>(null);

  const sorted = [...sequences].sort((a, b) => a.step - b.step);

  const statusStyle: Record<string, { color: string; bg: string; border: string; label: string }> = {
    sent:          { color: '#4ade80', bg: '#052e16', border: '#166534', label: 'Sent' },
    pending:       { color: '#fbbf24', bg: '#1c1208', border: '#78350f', label: 'Pending' },
    skipped:       { color: '#64748b', bg: '#0f172a', border: '#1e293b', label: 'Skipped' },
    unsubscribed:  { color: '#f87171', bg: '#450a0a', border: '#7f1d1d', label: 'Unsubscribed' },
    replied:       { color: '#a78bfa', bg: '#12082a', border: '#4c1d95', label: 'Replied' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {sorted.map((seq) => {
        const st = statusStyle[seq.status] ?? statusStyle.pending;
        const isPending = seq.status === 'pending';
        const isOverdue = isPending && new Date(seq.scheduled_for) < new Date();

        return (
          <div key={seq.id} style={{ backgroundColor: '#050d1a', border: `1px solid ${st.border}`, borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #0f172a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#475569', fontSize: '12px', fontWeight: 700 }}>Step {seq.step}</span>
                <span style={{ backgroundColor: st.bg, border: `1px solid ${st.border}`, color: st.color, borderRadius: '999px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                  {isOverdue ? '⚠ OVERDUE' : st.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#334155', fontSize: '10px' }}>
                  {seq.sent_at ? `Sent ${formatDate(seq.sent_at)}` : isPending ? `Due ${formatDate(seq.scheduled_for)}` : ''}
                </span>
                {isPending && (
                  <button
                    onClick={async () => {
                      setSendingId(seq.id);
                      await onSendNow(seq);
                      setSendingId(null);
                    }}
                    disabled={sendingId === seq.id}
                    style={{
                      backgroundColor: isOverdue ? '#7f1d1d' : '#1e3a5f',
                      border: `1px solid ${isOverdue ? '#ef4444' : '#3b82f6'}`,
                      color: isOverdue ? '#fca5a5' : '#93c5fd',
                      borderRadius: '6px', padding: '4px 10px',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      opacity: sendingId === seq.id ? 0.6 : 1,
                    }}
                  >
                    {sendingId === seq.id ? 'Sending…' : 'Send now'}
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: '10px 14px' }}>
              <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{seq.subject}</p>
              <p style={{ color: '#334155', fontSize: '11px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {seq.body.slice(0, 200)}{seq.body.length > 200 ? '…' : ''}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function DetailModal({
  card,
  onClose,
  onMove,
  onDelete,
  onUnsubscribe,
  onSendNow,
  onSaveNotes,
  onSaveValue,
}: {
  card: CrmCard;
  onClose: () => void;
  onMove: (status: CardStatus) => Promise<void>;
  onDelete: () => Promise<void>;
  onUnsubscribe: () => Promise<void>;
  onSendNow: (seq: SequenceRow) => Promise<void>;
  onSaveNotes: (notes: string) => Promise<void>;
  onSaveValue: (eur: number | null) => Promise<void>;
}) {
  const lead = card.lf_leads;
  const [notes, setNotes] = useState(card.notes ?? '');
  const [valueInput, setValueInput] = useState(card.value_eur?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unsub, setUnsub] = useState(false);
  const col = COLUMNS.find((c) => c.key === card.status)!;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '0' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: '#040d1a', borderLeft: '1px solid #1e293b', width: '100%', maxWidth: '540px', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', position: 'sticky', top: 0, backgroundColor: '#040d1a', zIndex: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 800, lineHeight: 1.2, marginBottom: '4px' }}>{lead.name}</p>
            {lead.email && <p style={{ color: '#60a5fa', fontSize: '13px', fontFamily: 'monospace' }}>{lead.email}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px', fontSize: '20px', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Stage + quick info */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ backgroundColor: col.bg, border: `1px solid ${col.border}`, color: col.color, borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: 700 }}>
              {col.emoji} {col.label}
            </span>
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ color: '#475569', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🌐 {lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </a>
            )}
            {lead.phone && <span style={{ color: '#475569', fontSize: '12px' }}>📞 {lead.phone}</span>}
            <span style={{ color: '#334155', fontSize: '11px' }}>Added {timeAgo(card.created_at)}</span>
          </div>

          {/* Move to stage */}
          <div>
            <p style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Move to stage</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {COLUMNS.filter((c) => c.key !== card.status).map((c) => (
                <button
                  key={c.key}
                  onClick={() => onMove(c.key)}
                  style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.color, borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deal value */}
          <div>
            <p style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Deal value (€)</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                placeholder="e.g. 1500"
                style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#f1f5f9', fontSize: '14px' }}
              />
              <button
                onClick={async () => {
                  setSaving(true);
                  const v = valueInput ? parseInt(valueInput) : null;
                  await onSaveValue(v);
                  setSaving(false);
                }}
                style={{ backgroundColor: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={async () => { if (notes !== (card.notes ?? '')) await onSaveNotes(notes); }}
              placeholder="Add notes about this lead…"
              style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#e2e8f0', fontSize: '13px', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box', lineHeight: 1.5 }}
            />
          </div>

          {/* Email sequence */}
          <div>
            <p style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Email sequence</p>
            {card.lf_sequences?.length > 0
              ? <SequenceTimeline sequences={card.lf_sequences} onSendNow={onSendNow} />
              : <p style={{ color: '#334155', fontSize: '13px' }}>No sequences found.</p>
            }
          </div>

          {/* Danger zone */}
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={async () => { setUnsub(true); await onUnsubscribe(); setUnsub(false); }}
              disabled={unsub}
              style={{ flex: 1, backgroundColor: '#1c0a08', border: '1px solid #78350f', color: '#fbbf24', borderRadius: '10px', padding: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: unsub ? 0.6 : 1 }}
            >
              {unsub ? 'Unsubscribing…' : '🚫 Mark Unsubscribed'}
            </button>
            <button
              onClick={async () => {
                if (!confirm(`Delete ${lead.name} from CRM? This cannot be undone.`)) return;
                setDeleting(true);
                await onDelete();
              }}
              disabled={deleting}
              style={{ flex: 1, backgroundColor: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: '10px', padding: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
            >
              {deleting ? 'Deleting…' : '🗑 Delete Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const [cards, setCards] = useState<CrmCard[]>([]);
  const [warmup, setWarmup] = useState<WarmupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<CrmCard | null>(null);
  const [dragOverCol, setDragOverCol] = useState<CardStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  useEffect(() => { load(); }, [load]);

  // Sync selectedCard when cards refresh
  useEffect(() => {
    if (selectedCard) {
      const updated = cards.find((c) => c.id === selectedCard.id);
      if (updated) setSelectedCard(updated);
    }
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────────

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
    else {
      const d = await res.json();
      alert(d.error ?? 'Send failed');
    }
  };

  // ── Drag-and-drop ────────────────────────────────────────────────────────────

  const onDrop = (col: CardStatus) => {
    if (draggingId) moveCard(draggingId, col);
    setDragOverCol(null);
    setDraggingId(null);
  };

  // ── Stats ────────────────────────────────────────────────────────────────────

  const active = cards.filter((c) => !['won', 'lost'].includes(c.status));
  const won = cards.filter((c) => c.status === 'won');
  const pipelineValue = active.reduce((s, c) => s + (c.value_eur ?? 0), 0);
  const wonValue = won.reduce((s, c) => s + (c.value_eur ?? 0), 0);
  const dueToday = cards.filter((c) => {
    const next = nextPendingSeq(c.lf_sequences ?? []);
    if (!next) return false;
    return new Date(next.scheduled_for) <= new Date();
  }).length;
  const conversionRate = cards.length > 0 ? Math.round((won.length / cards.length) * 100) : 0;

  // ── Filter ───────────────────────────────────────────────────────────────────

  const filtered = search.trim()
    ? cards.filter((c) => c.lf_leads.name.toLowerCase().includes(search.toLowerCase()) || c.lf_leads.email?.toLowerCase().includes(search.toLowerCase()))
    : cards;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#020609', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#475569', fontSize: '14px' }}>Loading CRM…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#020609', display: 'flex', flexDirection: 'column' }}>

      {/* Sticky header */}
      <header style={{ borderBottom: '1px solid #1e293b', backgroundColor: 'rgba(2,6,9,0.97)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ color: '#475569', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            Search
          </Link>
          <span style={{ color: '#1e293b' }}>|</span>
          <h1 style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: 800, whiteSpace: 'nowrap' }}>CRM Pipeline</h1>
          <div style={{ flex: 1 }} />
          {/* Search */}
          <div style={{ position: 'relative', maxWidth: '220px', width: '100%' }}>
            <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads…"
              style={{ width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b', borderRadius: '8px', padding: '7px 10px 7px 30px', color: '#e2e8f0', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={load} style={{ background: 'none', border: '1px solid #1e293b', color: '#475569', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>
            ↻ Refresh
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%', padding: '20px 20px 40px' }}>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <StatCard label="Active Leads" value={String(active.length)} sub={`${cards.length} total`} />
          <StatCard label="Pipeline Value" value={pipelineValue > 0 ? `€${pipelineValue.toLocaleString()}` : '—'} sub="active stages" color="#60a5fa" />
          <StatCard label="Won Value" value={wonValue > 0 ? `€${wonValue.toLocaleString()}` : '—'} sub={`${won.length} deals closed`} color="#4ade80" />
          <StatCard label="Conversion" value={`${conversionRate}%`} sub={`${won.length} won · ${cards.filter(c=>c.status==='lost').length} lost`} color={conversionRate > 10 ? '#4ade80' : '#f59e0b'} />
          <StatCard
            label="Follow-ups Due"
            value={String(dueToday)}
            sub="overdue or due today"
            color={dueToday > 0 ? '#f87171' : '#4ade80'}
          />
        </div>

        {/* Warm-up bar */}
        {warmup && (
          <div style={{ backgroundColor: '#0a1628', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Domain Warm-up — Week {warmup.week}
                </span>
                <span style={{ color: warmup.ok ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 700 }}>
                  {warmup.count}/{warmup.limit} today
                </span>
              </div>
              <div style={{ height: '4px', backgroundColor: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((warmup.count / warmup.limit) * 100, 100)}%`, backgroundColor: warmup.ok ? '#3b82f6' : '#ef4444', borderRadius: '999px' }} />
              </div>
            </div>
            <span style={{ color: '#334155', fontSize: '11px', whiteSpace: 'nowrap' }}>
              Next ramp in {warmup.daysUntilRamp}d → {warmup.nextLimit}/day
            </span>
            {!warmup.ok && (
              <span style={{ backgroundColor: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '6px', padding: '4px 10px', color: '#fca5a5', fontSize: '11px', fontWeight: 700 }}>
                Limit reached — resets midnight UTC
              </span>
            )}
          </div>
        )}

        {/* Kanban */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(230px, 1fr))', gap: '10px', overflowX: 'auto', minHeight: '60vh' }}>
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
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: col.color, fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {col.emoji} {col.label}
                    </span>
                    <span style={{ backgroundColor: col.bg, border: `1px solid ${col.border}`, color: col.color, borderRadius: '999px', padding: '2px 7px', fontSize: '11px', fontWeight: 800 }}>
                      {colCards.length}
                    </span>
                  </div>
                  {colValue > 0 && (
                    <p style={{ color: '#475569', fontSize: '11px' }}>€{colValue.toLocaleString()}</p>
                  )}
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {colCards.map((card) => {
                    const lead = card.lf_leads;
                    const nextSeq = nextPendingSeq(card.lf_sequences ?? []);
                    const fu = nextSeq ? followUpLabel(nextSeq) : null;
                    const allDone = (card.lf_sequences ?? []).length > 0 && (card.lf_sequences ?? []).every((s) => s.status !== 'pending');

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={() => setDraggingId(card.id)}
                        onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                        onClick={() => setSelectedCard(card)}
                        style={{
                          backgroundColor: '#0a1628',
                          border: `1px solid ${fu?.urgent ? '#7f1d1d' : '#1e293b'}`,
                          borderRadius: '12px', padding: '12px',
                          cursor: 'pointer',
                          opacity: draggingId === card.id ? 0.4 : 1,
                          transition: 'opacity 0.15s, border-color 0.15s',
                        }}
                      >
                        {/* Name */}
                        <p style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 700, lineHeight: 1.3, marginBottom: '3px' }}>{lead.name}</p>

                        {/* Email */}
                        {lead.email && (
                          <p style={{ color: '#334155', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}>
                            {lead.email}
                          </p>
                        )}

                        {/* Follow-up or done badge */}
                        {fu ? (
                          <div style={{ backgroundColor: fu.urgent ? '#450a0a' : fu.future ? '#0f172a' : '#1c1208', border: `1px solid ${fu.urgent ? '#7f1d1d' : fu.future ? '#1e293b' : '#78350f'}`, borderRadius: '6px', padding: '3px 8px', marginBottom: '8px', fontSize: '10px', fontWeight: 700, color: fu.urgent ? '#fca5a5' : fu.future ? '#475569' : '#fbbf24' }}>
                            {fu.label}
                          </div>
                        ) : allDone ? (
                          <div style={{ fontSize: '10px', color: '#166534', marginBottom: '8px', fontWeight: 700 }}>✓ Sequence complete</div>
                        ) : null}

                        {/* Value */}
                        {card.value_eur && (
                          <p style={{ color: '#4ade80', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>€{card.value_eur.toLocaleString()}</p>
                        )}

                        {/* Notes preview */}
                        {card.notes && (
                          <p style={{ color: '#475569', fontSize: '10px', lineHeight: 1.4, marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                            {card.notes}
                          </p>
                        )}

                        <p style={{ color: '#1e293b', fontSize: '10px', textAlign: 'right' }}>{timeAgo(card.created_at)}</p>
                      </div>
                    );
                  })}

                  {colCards.length === 0 && (
                    <div style={{ color: '#0d1929', fontSize: '12px', textAlign: 'center', paddingTop: '32px', userSelect: 'none' }}>
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {cards.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#334155' }}>
            <p style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: '#475569' }}>No leads in CRM yet</p>
            <p style={{ fontSize: '14px', marginBottom: '24px' }}>Go to search and click <strong style={{ color: '#60a5fa' }}>Add to CRM & Send</strong> on a lead.</p>
            <Link href="/" style={{ backgroundColor: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              ← Go to Search
            </Link>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedCard && (
        <DetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onMove={async (status) => { await moveCard(selectedCard.id, status); setSelectedCard((p) => p ? { ...p, status } : null); }}
          onDelete={() => deleteCard(selectedCard.id)}
          onUnsubscribe={() => unsubscribe(selectedCard.id)}
          onSendNow={sendNow}
          onSaveNotes={(notes) => saveNotes(selectedCard.id, notes)}
          onSaveValue={(v) => saveValue(selectedCard.id, v)}
        />
      )}
    </div>
  );
}
