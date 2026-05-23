import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const maxDuration = 10;

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('lf_crm_cards')
      .select(`
        id, status, notes, value_eur, created_at, updated_at,
        lf_leads (
          id, name, email, phone, website, country, weakness_score,
          weakness_reasons, email_subject, email_body, created_at
        ),
        lf_sequences (
          id, step, status, scheduled_for, sent_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ cards: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch CRM cards';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
