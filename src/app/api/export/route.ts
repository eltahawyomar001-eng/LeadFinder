import { NextRequest, NextResponse } from 'next/server';
import type { Lead } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { leads } = (await req.json()) as { leads: Lead[] };

    const headers = [
      'Name',
      'Phone',
      'WhatsApp Link',
      'Address',
      'Website',
      'Rating',
      'Reviews',
      'Status',
      'Weakness Score',
      'WhatsApp Message',
    ];

    const rows = leads.map((l) => [
      l.name,
      l.phone ?? '',
      l.whatsapp_link ?? '',
      l.formatted_address,
      l.website ?? '',
      l.rating !== null ? String(l.rating) : '',
      l.user_ratings_total !== null ? String(l.user_ratings_total) : '',
      l.business_status,
      String(l.weakness_score),
      l.whatsapp_message.replace(/\n/g, ' | '),
    ]);

    const escape = (v: string) =>
      `"${v.replace(/"/g, '""')}"`;

    const csv = [
      headers.map(escape).join(','),
      ...rows.map((r) => r.map(escape).join(',')),
    ].join('\r\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="leads.csv"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
