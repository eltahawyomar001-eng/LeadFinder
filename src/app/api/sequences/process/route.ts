import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { checkWarmup, logSend } from '@/lib/warmup';
import { detectBodyLang, unsubscribeFooter } from '@/lib/emailFooter';

export const maxDuration = 60;

// Called by Vercel cron daily at 08:00 UTC
export async function POST() {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });

    const fromName = process.env.FROM_NAME ?? 'Omar Rageh';
    const fromEmail = process.env.FROM_EMAIL ?? 'onboarding@resend.dev';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lead-finder-vert.vercel.app';
    const resend = new Resend(resendKey);
    const supabase = getSupabase();

    // Fetch all due pending sequences (ordered by step so we send step 2 before step 3 if both due)
    const { data: due, error } = await supabase
      .from('lf_sequences')
      .select(`
        id, step, subject, body, lead_id,
        lf_leads ( id, name, email )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('step', { ascending: true })
      .limit(50);

    if (error) throw new Error(error.message);
    if (!due || due.length === 0) return NextResponse.json({ ok: true, sent: 0, message: 'No sequences due' });

    let sent = 0;
    let skipped = 0;
    const results: Array<{ sequenceId: string; status: 'sent' | 'skipped' | 'error'; reason?: string }> = [];

    for (const seq of due) {
      const lead = Array.isArray(seq.lf_leads) ? seq.lf_leads[0] : seq.lf_leads as { email: string; name: string; id: string } | null;
      if (!lead?.email) {
        await supabase.from('lf_sequences').update({ status: 'skipped' }).eq('id', seq.id);
        results.push({ sequenceId: seq.id, status: 'skipped', reason: 'no email' });
        skipped++;
        continue;
      }

      // Check quota before each send
      const warmup = await checkWarmup();
      if (!warmup.ok) {
        // Reschedule to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);
        await supabase.from('lf_sequences')
          .update({ scheduled_for: tomorrow.toISOString() })
          .eq('id', seq.id);
        results.push({ sequenceId: seq.id, status: 'skipped', reason: `quota_exhausted (${warmup.count}/${warmup.limit})` });
        skipped++;
        break; // Quota is global — no point checking further
      }

      try {
        const lang = detectBodyLang(seq.body);
        const bodyWithUnsub = seq.body + unsubscribeFooter(lead.id, lang, baseUrl);

        const { error: sendErr } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          replyTo: fromEmail,
          to: lead.email,
          subject: seq.subject,
          text: bodyWithUnsub,
        });

        if (sendErr) throw new Error(sendErr.message);

        await supabase.from('lf_sequences').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        }).eq('id', seq.id);

        await logSend({ leadId: lead.id, sequenceId: seq.id });

        sent++;
        results.push({ sequenceId: seq.id, status: 'sent' });
      } catch (e) {
        results.push({ sequenceId: seq.id, status: 'error', reason: e instanceof Error ? e.message : 'unknown' });
      }
    }

    return NextResponse.json({ ok: true, sent, skipped, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sequence processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
