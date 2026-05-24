import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

interface ImportRow {
  name: string;
  email: string;
  website?: string;
  country?: string;
  phone?: string;
}

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json() as { rows: ImportRow[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    const sb = getSupabase();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (!row.name?.trim() || !row.email?.trim()) { skipped++; continue; }

      const email = row.email.trim().toLowerCase();
      const name = row.name.trim();
      const country = (row.country?.trim() || 'de').toLowerCase();
      const website = row.website?.trim() || null;
      const phone = row.phone?.trim() || null;
      const placeId = `csv_${email}`;

      try {
        const { data: leadRow, error: leadErr } = await sb
          .from('lf_leads')
          .upsert({
            place_id: placeId,
            name,
            email,
            phone,
            website,
            address: null,
            country,
            weakness_score: 0,
            weakness_reasons: [],
            website_builder: null,
            email_subject: null,
            email_body: null,
          }, { onConflict: 'place_id' })
          .select('id')
          .single();

        if (leadErr) { errors.push(`${name}: ${leadErr.message}`); skipped++; continue; }

        const leadId: string = leadRow.id;

        const { data: existing } = await sb
          .from('lf_crm_cards')
          .select('id')
          .eq('lead_id', leadId)
          .maybeSingle();

        if (!existing) {
          await sb.from('lf_crm_cards').insert({ lead_id: leadId, status: 'contacted' });
        }

        imported++;
      } catch (e) {
        errors.push(`${name}: ${e instanceof Error ? e.message : 'unknown'}`);
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, imported, skipped, errors: errors.slice(0, 10) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Import failed' }, { status: 500 });
  }
}
