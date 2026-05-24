import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { placeIds } = await req.json() as { placeIds: string[] };
    if (!Array.isArray(placeIds) || placeIds.length === 0) {
      return NextResponse.json({ existing: [] });
    }

    const { data } = await getSupabase()
      .from('lf_leads')
      .select('place_id')
      .in('place_id', placeIds.slice(0, 200)); // cap to avoid giant queries

    return NextResponse.json({ existing: (data ?? []).map((r) => r.place_id) });
  } catch {
    return NextResponse.json({ existing: [] });
  }
}
