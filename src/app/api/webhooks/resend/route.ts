import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret && req.nextUrl.searchParams.get('secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = payload.type as string | undefined;
  const data = payload.data as Record<string, unknown> | undefined;
  const toList = (data?.to ?? data?.email_id) as unknown;
  const toEmail: string | undefined = Array.isArray(toList) ? toList[0] : typeof toList === 'string' ? toList : undefined;

  if (!toEmail || (type !== 'email.bounced' && type !== 'email.spam_complained')) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = getSupabase();

  // Find lead by email
  const { data: lead } = await supabase
    .from('lf_leads')
    .select('id')
    .eq('email', toEmail)
    .maybeSingle();

  if (!lead) return NextResponse.json({ ok: true, skipped: true });

  const leadId: string = lead.id;
  const newStatus = type === 'email.bounced' ? 'bounced' : 'unsubscribed';
  const note = type === 'email.bounced'
    ? `Email bounced — sequence stopped automatically.`
    : `Spam complaint received — unsubscribed automatically.`;

  // Cancel all pending sequences for this lead
  await supabase
    .from('lf_sequences')
    .update({ status: newStatus })
    .eq('lead_id', leadId)
    .eq('status', 'pending');

  // Add note to CRM card
  const { data: card } = await supabase
    .from('lf_crm_cards')
    .select('id, notes')
    .eq('lead_id', leadId)
    .maybeSingle();

  if (card) {
    const existing = (card.notes as string | null) ?? '';
    const updated = existing ? `${existing}\n\n[${new Date().toISOString()}] ${note}` : `[${new Date().toISOString()}] ${note}`;
    await supabase.from('lf_crm_cards').update({ notes: updated }).eq('id', card.id);
  }

  return NextResponse.json({ ok: true, leadId, action: newStatus });
}
