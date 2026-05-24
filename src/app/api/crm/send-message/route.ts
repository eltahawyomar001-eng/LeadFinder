import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { textToHtml } from '@/lib/emailHtml';
import { checkWarmup, logSend } from '@/lib/warmup';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const { cardId, subject, body } = await req.json() as {
      cardId: string;
      subject: string;
      body: string;
    };

    if (!cardId || !subject?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'cardId, subject and body required' }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });

    const supabase = getSupabase();

    // Fetch lead email via card
    const { data: card } = await supabase
      .from('lf_crm_cards')
      .select('lead_id, lf_leads(id, email)')
      .eq('id', cardId)
      .single();

    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

    const lead = Array.isArray(card.lf_leads) ? card.lf_leads[0] : card.lf_leads as { id: string; email: string } | null;
    if (!lead?.email) return NextResponse.json({ error: 'Lead has no email' }, { status: 400 });

    // Check warmup quota
    const warmup = await checkWarmup();
    if (!warmup.ok) {
      return NextResponse.json(
        { error: `Daily send limit reached (${warmup.count}/${warmup.limit}).` },
        { status: 429 },
      );
    }

    const fromName = process.env.FROM_NAME ?? 'Omar Rageh';
    const fromEmail = process.env.FROM_EMAIL ?? 'onboarding@resend.dev';

    const resend = new Resend(resendKey);
    const { error: sendErr } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      replyTo: fromEmail,
      to: lead.email,
      subject,
      html: textToHtml(body),
      text: body,
    });

    if (sendErr) throw new Error(sendErr.message);

    await logSend({ leadId: lead.id });

    // Log as a manual sequence entry (step 99 = manual outreach)
    await supabase.from('lf_sequences').insert({
      lead_id: lead.id,
      step: 99,
      status: 'sent',
      scheduled_for: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      subject,
      body,
    });

    // Append note to CRM card
    const { data: cardFull } = await supabase
      .from('lf_crm_cards')
      .select('notes')
      .eq('id', cardId)
      .single();

    const existing = (cardFull?.notes as string | null) ?? '';
    const note = `[${new Date().toISOString()}] Manual message sent: "${subject}"`;
    await supabase.from('lf_crm_cards').update({
      notes: existing ? `${existing}\n\n${note}` : note,
    }).eq('id', cardId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
