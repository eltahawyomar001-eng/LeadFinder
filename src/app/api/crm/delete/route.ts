import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function DELETE(req: NextRequest) {
  try {
    const { cardId } = await req.json() as { cardId: string };
    if (!cardId) return NextResponse.json({ error: 'cardId required' }, { status: 400 });

    const supabase = getSupabase();

    // Get lead_id before deleting card
    const { data: card } = await supabase
      .from('lf_crm_cards')
      .select('lead_id')
      .eq('id', cardId)
      .single();

    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

    // Delete card (sequences + send_log cascade via lead)
    await supabase.from('lf_crm_cards').delete().eq('id', cardId);

    // Delete lead + its sequences (cascades to lf_sequences, lf_send_log)
    await supabase.from('lf_leads').delete().eq('id', card.lead_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
