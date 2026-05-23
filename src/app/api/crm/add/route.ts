import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { checkWarmup, logSend } from '@/lib/warmup';
import { generateFollowUpPitch } from '@/lib/whatsapp';
import { detectBodyLang, unsubscribeFooter } from '@/lib/emailFooter';
import type { Lead } from '@/types';
import type { PitchLang, Country } from '@/types';

export const maxDuration = 15;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
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
    const unsub = unsubscribeFooter(leadId, lang as 'de' | 'en' | 'ar', baseUrl);
    const step1Body = lead.email_body + unsub;

    const resend = new Resend(resendKey);
    const { error: sendErr } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      replyTo: fromEmail,
      to: lead.email,
      subject: lead.email_subject,
      text: step1Body,
    });
    if (sendErr) throw new Error(sendErr.message);

    // Log step 1 send
    await logSend({ leadId });

    const country: Country = 'de';
    const calendlyUrl = process.env.CALENDLY_URL ?? undefined;

    const now = new Date();

    // Generate + store step 1 as sent, steps 2 & 3 as pending
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
        subject: lead.email_subject,
        body: step1Body,
      },
      {
        lead_id: leadId,
        step: 2,
        status: 'pending',
        scheduled_for: addDays(now, 3).toISOString(),
        subject: step2.subject,
        body: step2Body,
      },
      {
        lead_id: leadId,
        step: 3,
        status: 'pending',
        scheduled_for: addDays(now, 7).toISOString(),
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
