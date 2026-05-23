import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id   = searchParams.get('id');
  const lang = searchParams.get('lang') ?? 'en';

  const base = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  if (!id) {
    return NextResponse.redirect(`${base}/unsubscribed?error=1&lang=${lang}`);
  }

  const supabase = getSupabase();

  // Get lead name for the confirmation page
  const { data: lead } = await supabase
    .from('lf_leads')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  if (!lead) {
    // Already gone — show confirmation anyway
    return NextResponse.redirect(`${base}/unsubscribed?lang=${lang}`);
  }

  // Cancel all pending sequences
  await supabase
    .from('lf_sequences')
    .update({ status: 'unsubscribed' })
    .eq('lead_id', id)
    .eq('status', 'pending');

  // Move CRM card to lost + note
  await supabase
    .from('lf_crm_cards')
    .update({ status: 'lost', notes: 'Unsubscribed via email link' })
    .eq('lead_id', id);

  const name = encodeURIComponent(lead.name ?? '');
  return NextResponse.redirect(`${base}/unsubscribed?lang=${lang}&name=${name}`);
}
