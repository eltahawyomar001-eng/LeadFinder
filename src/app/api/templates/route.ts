import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await getSupabase()
    .from('lf_email_templates')
    .select('id, name, subject, body, created_at')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { name, subject, body } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const { data, error } = await getSupabase()
    .from('lf_email_templates')
    .insert({ name: name.trim(), subject: (subject ?? '').trim(), body: (body ?? '').trim() })
    .select('id, name, subject, body, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function PATCH(req: NextRequest) {
  const { id, name, subject, body } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await getSupabase()
    .from('lf_email_templates')
    .update({ name: name?.trim(), subject: (subject ?? '').trim(), body: (body ?? '').trim() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await getSupabase().from('lf_email_templates').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
