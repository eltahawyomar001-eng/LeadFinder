import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { checkWarmup, logSend } from '@/lib/warmup';
import { generateFollowUpPitch } from '@/lib/whatsapp';
import { detectBodyLang, unsubscribeFooter } from '@/lib/emailFooter';
import { textToHtml } from '@/lib/emailHtml';

export const maxDuration = 30;

function nextBestSendTime(after: Date, minDays: number): Date {
  const d = new Date(after);
  d.setUTCDate(d.getUTCDate() + minDays);
  d.setUTCHours(9, 0, 0, 0);
  const offsets = [2, 1, 0, 1, 0, 4, 3];
  d.setUTCDate(d.getUTCDate() + offsets[d.getUTCDay()]);
  return d;
}

/**
 * Restart a 3-step sequence for a lead whose previous sequence is fully done.
 * Deletes old sequences, sends step 1 immediately, schedules steps 2 & 3.
 */
export async function POST(req: NextRequest) {
  try {
    const { cardId } = await req.json() as { cardId: string };
    if (!cardId) return NextResponse.json({ error: 'cardId required' }, { status: 400 });

    const warmup = await checkWarmup();
    if (!warmup.ok) {
      return NextResponse.json({ error: `Daily limit reached (${warmup.count}/${warmup.limit})` }, { status: 429 });
    }

    const sb = getSupabase();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lead-finder-vert.vercel.app';

    // Fetch card + lead
    const { data: card } = await sb
      .from('lf_crm_cards')
      .select('id, lead_id, lf_leads(id, name, email, email_subject, email_body, weakness_reasons, website, country)')
      .eq('id', cardId)
      .single();

    if (!card?.lf_leads) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    const lead = card.lf_leads as unknown as {
      id: string; name: string; email: string | null;
      email_subject: string | null; email_body: string | null;
      weakness_reasons: string[]; website: string | null; country: string;
    };
    if (!lead.email) return NextResponse.json({ error: 'No email on lead' }, { status: 400 });

    // Delete existing sequences
    await sb.from('lf_sequences').delete().eq('lead_id', lead.id);

    // Regenerate pitches
    const lang = detectBodyLang(lead.email_body ?? '');
    const country = (lead.country ?? 'de') as import('@/types').Country;
    const reasons = lead.weakness_reasons ?? [];
    const calendlyUrl = process.env.CALENDLY_URL ?? undefined;

    const step1Subject = lead.email_subject ?? `Follow-up — ${lead.name}`;
    const step1Body = (lead.email_body ?? '') + unsubscribeFooter(lead.id, lang, baseUrl);

    const step2 = generateFollowUpPitch(2, lead.name, reasons, lang, country, { calendlyUrl });
    const step3 = generateFollowUpPitch(3, lead.name, reasons, lang, country, { calendlyUrl });

    const now = new Date();
    const trackingUrl = `${baseUrl}/api/track/open/${lead.id}/1`;

    // Send step 1 immediately
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: sendErr } = await resend.emails.send({
      from: 'Omar Rageh <omar@omarrageh.de>',
      to: lead.email,
      subject: step1Subject,
      html: textToHtml(step1Body, trackingUrl),
      text: step1Body,
    });
    if (sendErr) return NextResponse.json({ error: sendErr.message }, { status: 500 });
    await logSend({ leadId: lead.id });

    const sentAt = now.toISOString();
    const step2Due = nextBestSendTime(now, 3).toISOString();
    const step3Due = nextBestSendTime(now, 6).toISOString();

    await sb.from('lf_sequences').insert([
      { lead_id: lead.id, step: 1, status: 'sent', subject: step1Subject, body: step1Body, scheduled_for: sentAt, sent_at: sentAt },
      { lead_id: lead.id, step: 2, status: 'pending', subject: step2.subject, body: step2.body, scheduled_for: step2Due },
      { lead_id: lead.id, step: 3, status: 'pending', subject: step3.subject, body: step3.body, scheduled_for: step3Due },
    ]);

    // Move card back to contacted
    await sb.from('lf_crm_cards').update({ status: 'contacted', updated_at: now.toISOString() }).eq('id', cardId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Restart failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
