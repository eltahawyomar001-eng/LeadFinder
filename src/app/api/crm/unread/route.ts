import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// Returns count of CRM cards that moved to 'replied' in the last 7 days
export async function GET() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await getSupabase()
    .from('lf_crm_cards')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'replied')
    .gte('updated_at', since);

  return NextResponse.json({ count: count ?? 0 }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
