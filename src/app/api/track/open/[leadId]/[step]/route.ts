import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// 1×1 transparent GIF
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string; step: string }> },
) {
  const { leadId, step } = await params;
  if (leadId && step) {
    try {
      await getSupabase()
        .from('lf_sequences')
        .update({ opened_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('step', parseInt(step, 10))
        .is('opened_at', null); // only record the first open
    } catch { /* non-fatal — always return the pixel */ }
  }
  return new NextResponse(GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
