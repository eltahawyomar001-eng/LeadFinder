import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { cardId } = await req.json() as { cardId: string };
    if (!cardId) return NextResponse.json({ error: 'cardId required' }, { status: 400 });

    const supabase = getSupabase();

    const { data: card } = await supabase
      .from('lf_crm_cards')
      .select('lead_id')
      .eq('id', cardId)
      .single();

    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

    // Cancel all pending sequences for this lead
    await supabase
      .from('lf_sequences')
      .update({ status: 'unsubscribed' })
      .eq('lead_id', card.lead_id)
      .eq('status', 'pending');

    // Move card to lost
    await supabase
      .from('lf_crm_cards')
      .update({ status: 'lost', notes: 'Unsubscribed' })
      .eq('id', cardId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unsubscribe failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
