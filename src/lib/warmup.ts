import { getSupabase } from './supabase';

// omarrageh.de went live May 23 2026 — ramp daily send cap week-by-week
const DOMAIN_START = new Date('2026-05-23T00:00:00Z').getTime();
const RAMP = [10, 20, 40, 80]; // week 1 → week 4+

export function getDailyLimit(): number {
  const week = Math.floor((Date.now() - DOMAIN_START) / (7 * 24 * 3600 * 1000));
  return RAMP[Math.min(week, RAMP.length - 1)];
}

export async function getTodaySendCount(): Promise<number> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const { count } = await getSupabase()
    .from('lf_send_log')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', today.toISOString());
  return count ?? 0;
}

export async function checkWarmup(): Promise<{ ok: boolean; count: number; limit: number }> {
  const limit = getDailyLimit();
  const count = await getTodaySendCount();
  return { ok: count < limit, count, limit };
}

export async function logSend(opts: { leadId?: string; sequenceId?: string }): Promise<void> {
  await getSupabase().from('lf_send_log').insert({
    lead_id: opts.leadId ?? null,
    sequence_id: opts.sequenceId ?? null,
    provider: 'resend',
  });
}
