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

    const { error } = await getSupabase()
      .from('lf_crm_cards')
      .update(update)
      .eq('id', cardId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Move failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
