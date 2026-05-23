import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body } = await req.json() as {
      to: string;
      subject: string;
      body: string;
    };

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'to, subject, body are required' }, { status: 400 });
    }

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      return NextResponse.json(
        { error: 'Gmail not configured — add GMAIL_USER and GMAIL_APP_PASSWORD to Vercel env vars' },
        { status: 503 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `Omar Rageh <${user}>`,
      to,
      subject,
      text: body,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
