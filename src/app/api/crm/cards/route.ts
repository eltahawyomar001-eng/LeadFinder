import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const maxDuration = 10;

export async function GET() {
  try {
    const supabase = getSupabase();

    // Step 1: fetch cards + leads (direct FK: lf_crm_cards.lead_id → lf_leads.id)
    const { data: cards, error: cardsErr } = await supabase
      .from('lf_crm_cards')
      .select(`
        id, status, notes, value_eur, created_at, updated_at,
        lf_leads (
          id, name, email, phone, website, country, weakness_score,
          weakness_reasons, email_subject, email_body, created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (cardsErr) throw new Error(cardsErr.message);
    if (!cards || cards.length === 0) return NextResponse.json({ cards: [] });

    // Step 2: fetch all sequences for these leads (FK: lf_sequences.lead_id → lf_leads.id)
    const leadIds = cards
      .map((c) => (Array.isArray(c.lf_leads) ? c.lf_leads[0]?.id : (c.lf_leads as { id: string } | null)?.id))
      .filter(Boolean) as string[];

    const { data: sequences, error: seqErr } = await supabase
      .from('lf_sequences')
      .select('id, step, status, scheduled_for, sent_at, subject, body, lead_id')
      .in('lead_id', leadIds);

    if (seqErr) throw new Error(seqErr.message);

    // Step 3: merge sequences into each card so the CRM page sees card.lf_sequences
    const merged = cards.map((card) => {
      const lead = Array.isArray(card.lf_leads) ? card.lf_leads[0] : card.lf_leads as { id: string } | null;
      return {
        ...card,
        lf_sequences: sequences?.filter((s) => s.lead_id === lead?.id) ?? [],
      };
    });

    return NextResponse.json({ cards: merged });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch CRM cards';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
