import { NextResponse } from 'next/server';
import { checkWarmup, getDailyLimit } from '@/lib/warmup';

export const maxDuration = 5;

export async function GET() {
  try {
    const status = await checkWarmup();
    const limit = getDailyLimit();

    // Days until next ramp-up
    const DOMAIN_START = new Date('2026-05-23T00:00:00Z').getTime();
    const msPerWeek = 7 * 24 * 3600 * 1000;
    const currentWeek = Math.floor((Date.now() - DOMAIN_START) / msPerWeek);
    const nextWeekStart = new Date(DOMAIN_START + (currentWeek + 1) * msPerWeek);
    const daysUntilRamp = Math.ceil((nextWeekStart.getTime() - Date.now()) / (24 * 3600 * 1000));
    const nextLimit = [10, 20, 40, 80][Math.min(currentWeek + 1, 3)];

    return NextResponse.json({
      ...status,
      limit,
      week: currentWeek + 1,
      daysUntilRamp,
      nextLimit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Status check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
