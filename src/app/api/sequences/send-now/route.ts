import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { checkWarmup, logSend } from '@/lib/warmup';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const { sequenceId } = await req.json() as { sequenceId: string };
    if (!sequenceId) return NextResponse.json({ error: 'sequenceId required' }, { status: 400 });

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });

    const supabase = getSupabase();

    const { data: seq } = await supabase
      .from('lf_sequences')
      .select('id, step, subject, body, status, lead_id, lf_leads(id, name, email)')
      .eq('id', sequenceId)
      .single();

    if (!seq) return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    if (seq.status !== 'pending') {
      return NextResponse.json({ error: `Cannot send — sequence status is "${seq.status}"` }, { status: 400 });
    }

    const lead = Array.isArray(seq.lf_leads) ? seq.lf_leads[0] : seq.lf_leads as { id: string; email: string } | null;
    if (!lead?.email) return NextResponse.json({ error: 'Lead has no email' }, { status: 400 });

    // Check warm-up quota
    const warmup = await checkWarmup();
    if (!warmup.ok) {
      return NextResponse.json(
        { error: `Daily limit reached (${warmup.count}/${warmup.limit})`, warmup },
        { status: 429 },
      );
    }

    const fromName = process.env.FROM_NAME ?? 'Omar Rageh';
    const fromEmail = process.env.FROM_EMAIL ?? 'onboarding@resend.dev';

    const resend = new Resend(resendKey);
    const { error: sendErr } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: lead.email,
      subject: seq.subject,
      text: seq.body,
    });
    if (sendErr) throw new Error(sendErr.message);

    const now = new Date().toISOString();
    await supabase.from('lf_sequences').update({ status: 'sent', sent_at: now }).eq('id', sequenceId);
    await logSend({ leadId: lead.id, sequenceId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
