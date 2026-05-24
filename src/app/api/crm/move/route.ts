import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const VALID_STATUSES = ['contacted', 'replied', 'meeting', 'proposal', 'won', 'lost'] as const;
type CardStatus = typeof VALID_STATUSES[number];

export async function PATCH(req: NextRequest) {
  try {
    const { cardId, status, notes, valueEur } = await req.json() as {
      cardId: string;
      status?: CardStatus;
      notes?: string;
      valueEur?: number;
    };

    if (!cardId) return NextResponse.json({ error: 'cardId required' }, { status: 400 });
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (status !== undefined) update.status = status;
    if (notes !== undefined) update.notes = notes;
    if (valueEur !== undefined) update.value_eur = valueEur;

    const sb = getSupabase();
    const { error } = await sb.from('lf_crm_cards').update(update).eq('id', cardId);
    if (error) throw new Error(error.message);

    // Auto-pause pending sequences when stage advances beyond 'contacted'
    const PAUSE_ON = new Set(['meeting', 'proposal', 'won', 'lost']);
    if (status && PAUSE_ON.has(status)) {
      const { data: card } = await sb
        .from('lf_crm_cards').select('lead_id').eq('id', cardId).single();
      if (card?.lead_id) {
        await sb.from('lf_sequences')
          .update({ status: 'skipped' })
          .eq('lead_id', card.lead_id)
          .eq('status', 'pending');
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Move failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
