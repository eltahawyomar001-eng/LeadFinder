import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { checkWarmup, logSend } from '@/lib/warmup';
import { generateEmailPitch, generateFollowUpPitch } from '@/lib/whatsapp';
import { detectBodyLang, unsubscribeFooter } from '@/lib/emailFooter';
import { getPageSpeed } from '@/lib/pagespeed';
import type { Lead } from '@/types';
import type { PitchLang, Country } from '@/types';

export const maxDuration = 30;

// Returns next Tuesday or Thursday at 09:00 UTC, at least minDays after `after`
function nextBestSendTime(after: Date, minDays: number): Date {
  const d = new Date(after);
  d.setUTCDate(d.getUTCDate() + minDays);
  d.setUTCHours(9, 0, 0, 0);
  // offsets to reach next Tue(2) or Thu(4): Sun+2, Mon+1, Tue+0, Wed+1, Thu+0, Fri+4, Sat+3
  const offsets = [2, 1, 0, 1, 0, 4, 3];
  d.setUTCDate(d.getUTCDate() + offsets[d.getUTCDay()]);
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const { lead } = await req.json() as { lead: Lead };

    if (!lead?.email || !lead?.email_subject || !lead?.email_body) {
      return NextResponse.json({ error: 'lead with email, email_subject, email_body required' }, { status: 400 });
    }

    // Check warm-up quota
    const warmup = await checkWarmup();
    if (!warmup.ok) {
      return NextResponse.json(
        { error: `Daily send limit reached (${warmup.count}/${warmup.limit}). Try again tomorrow.`, warmup },
        { status: 429 },
      );
    }

    const supabase = getSupabase();

    // Upsert lead record
    const { data: leadRow, error: leadErr } = await supabase
      .from('lf_leads')
      .upsert({
        place_id: lead.place_id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone ?? null,
        website: lead.website ?? null,
        address: lead.formatted_address ?? null,
        country: 'de',
        weakness_score: lead.weakness_score,
        weakness_reasons: lead.weakness_reasons ?? [],
        website_builder: lead.website_builder ?? null,
        email_subject: lead.email_subject,
        email_body: lead.email_body,
      }, { onConflict: 'place_id' })
      .select('id')
      .single();

    if (leadErr) throw new Error(leadErr.message);
    const leadId: string = leadRow.id;

    // Upsert CRM card (don't overwrite if already exists)
    const { data: existingCard } = await supabase
      .from('lf_crm_cards')
      .select('id, status')
      .eq('lead_id', leadId)
      .maybeSingle();

    if (!existingCard) {
      await supabase.from('lf_crm_cards').insert({ lead_id: leadId, status: 'contacted' });
    }

    // Send step 1 email
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });

    const fromName = process.env.FROM_NAME ?? 'Omar Rageh';
    const fromEmail = process.env.FROM_EMAIL ?? 'onboarding@resend.dev';

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lead-finder-vert.vercel.app';
    const lang: PitchLang = detectBodyLang(lead.email_body) as PitchLang;
    const country: Country = ((lead as unknown as Record<string, unknown>).country as Country) ?? (lang === 'ar' ? 'ae' : lang === 'en' ? 'gb' : 'de');
    const calendlyUrl = process.env.CALENDLY_URL ?? undefined;

    // Fetch PageSpeed score and optionally regenerate step 1 pitch with score
    let step1Subject = lead.email_subject;
    let step1BodyRaw = lead.email_body;
    if (lead.website) {
      const ps = await getPageSpeed(lead.website);
      if (ps && ps.score <= 59) {
        const refreshed = generateEmailPitch(lead.name, lead.weakness_reasons ?? [], lang, country, {
          builder: lead.website_builder ?? undefined,
          noWebsite: !lead.website,
          pageSpeedScore: ps.score,
          pageSpeedLoad: ps.loadTime,
        });
        step1Subject = refreshed.subject;
        step1BodyRaw = refreshed.body;
      }
    }

    const unsub = unsubscribeFooter(leadId, lang as 'de' | 'en' | 'ar', baseUrl);
    const step1Body = step1BodyRaw + unsub;

    const resend = new Resend(resendKey);
    const { error: sendErr } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      replyTo: fromEmail,
      to: lead.email,
      subject: step1Subject,
      text: step1Body,
    });
    if (sendErr) throw new Error(sendErr.message);

    // Log step 1 send
    await logSend({ leadId });

    const now = new Date();

    // Generate + store step 1 as sent, steps 2 & 3 as pending (Tue/Thu 9am UTC)
    const step2 = generateFollowUpPitch(2, lead.name, lead.weakness_reasons ?? [], lang, country, {
      builder: lead.website_builder ?? undefined,
      noWebsite: !lead.website,
      calendlyUrl,
    });
    const step3 = generateFollowUpPitch(3, lead.name, lead.weakness_reasons ?? [], lang, country, { calendlyUrl });

    const step2Body = step2.body + unsub;
    const step3Body = step3.body + unsub;

    await supabase.from('lf_sequences').upsert([
      {
        lead_id: leadId,
        step: 1,
        status: 'sent',
        scheduled_for: now.toISOString(),
        sent_at: now.toISOString(),
        subject: step1Subject,
        body: step1Body,
      },
      {
        lead_id: leadId,
        step: 2,
        status: 'pending',
        scheduled_for: nextBestSendTime(now, 3).toISOString(),
        subject: step2.subject,
        body: step2Body,
      },
      {
        lead_id: leadId,
        step: 3,
        status: 'pending',
        scheduled_for: nextBestSendTime(now, 6).toISOString(),
        subject: step3.subject,
        body: step3Body,
      },
    ], { onConflict: 'lead_id,step' });

    return NextResponse.json({ ok: true, leadId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CRM add failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
