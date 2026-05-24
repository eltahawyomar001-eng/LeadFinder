import { NextResponse } from 'next/server';
import { fetchRepliedEmails } from '@/lib/imap';
import { getSupabase } from '@/lib/supabase';

export const maxDuration = 60;

/**
 * Called hourly by Vercel cron. Fetches all INBOX FROM addresses from the
 * last 60 days, then marks any pending sequences as 'replied' and moves
 * the corresponding CRM cards to the 'replied' column.
 */
export async function GET() {
  const replied = await fetchRepliedEmails(60);
  if (replied.size === 0) {
    return NextResponse.json({ matched: 0, message: 'No replies in inbox' });
  }

  const sb = getSupabase();

  // Find leads whose email is in the replied set
  const { data: leads } = await sb
    .from('lf_leads')
    .select('id, email')
    .not('email', 'is', null);

  if (!leads?.length) return NextResponse.json({ matched: 0 });

  const matchedLeads = leads.filter((l) => l.email && replied.has(l.email.toLowerCase()));
  if (matchedLeads.length === 0) return NextResponse.json({ matched: 0 });

  const leadIds = matchedLeads.map((l) => l.id);

  // Cancel pending sequences for replied leads
  await sb
    .from('lf_sequences')
    .update({ status: 'replied' })
    .in('lead_id', leadIds)
    .eq('status', 'pending');

  // Move CRM cards to replied column
  const { data: cards } = await sb
    .from('lf_crm_cards')
    .select('id')
    .in('lead_id', leadIds)
    .neq('status', 'replied');

  if (cards?.length) {
    await sb
      .from('lf_crm_cards')
      .update({ status: 'replied', updated_at: new Date().toISOString() })
      .in('id', cards.map((c) => c.id));
  }

  return NextResponse.json({ matched: matchedLeads.length, leadIds });
}
