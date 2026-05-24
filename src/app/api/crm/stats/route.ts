import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const sb = getSupabase();

  const { data: seqs } = await sb
    .from('lf_sequences')
    .select('step, status, sent_at, opened_at, lead_id')
    .neq('step', 99); // exclude manual sends

  if (!seqs || seqs.length === 0) {
    return NextResponse.json({ sent: 0, opened: 0, replied: 0, openRate: 0, replyRate: 0, byStep: [] });
  }

  const sent = seqs.filter((s) => s.status === 'sent' || s.sent_at).length;
  const opened = seqs.filter((s) => s.opened_at != null).length;
  const replied = seqs.filter((s) => s.status === 'replied').length;

  // Per-step breakdown
  const stepMap = new Map<number, { sent: number; opened: number; replied: number }>();
  for (const s of seqs) {
    if (!stepMap.has(s.step)) stepMap.set(s.step, { sent: 0, opened: 0, replied: 0 });
    const entry = stepMap.get(s.step)!;
    if (s.status === 'sent' || s.sent_at) entry.sent++;
    if (s.opened_at) entry.opened++;
    if (s.status === 'replied') entry.replied++;
  }

  const byStep = [...stepMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([step, d]) => ({
      step,
      sent: d.sent,
      opened: d.opened,
      replied: d.replied,
      openRate: d.sent > 0 ? Math.round((d.opened / d.sent) * 100) : 0,
      replyRate: d.sent > 0 ? Math.round((d.replied / d.sent) * 100) : 0,
    }));

  // Reply count via CRM cards
  const { data: cards } = await sb
    .from('lf_crm_cards')
    .select('status');
  const totalReplied = (cards ?? []).filter((c) => c.status !== 'contacted').length;

  return NextResponse.json({
    sent,
    opened,
    replied: totalReplied,
    openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
    replyRate: sent > 0 ? Math.round((totalReplied / sent) * 100) : 0,
    byStep,
  });
}
