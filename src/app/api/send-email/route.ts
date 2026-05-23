import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

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

    const fromName = process.env.FROM_NAME ?? 'Omar Rageh';
    const fromEmail = process.env.FROM_EMAIL ?? process.env.GMAIL_USER ?? '';

    // ── Path 1: Resend (preferred — professional deliverability, custom domain) ──
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from: `${fromName} <${fromEmail || 'onboarding@resend.dev'}>`,
        to,
        subject,
        text: body,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, provider: 'resend' });
    }

    // ── Path 2: Custom SMTP (Google Workspace, Brevo, Mailgun SMTP, etc.) ─────
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `${fromName} <${fromEmail || smtpUser}>`,
        to, subject, text: body,
      });
      return NextResponse.json({ ok: true, provider: 'smtp' });
    }

    // ── Path 3: Gmail SMTP fallback (personal account — not recommended) ──────
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (gmailUser && gmailPass) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: gmailUser, pass: gmailPass },
      });
      await transporter.sendMail({
        from: `${fromName} <${gmailUser}>`,
        to, subject, text: body,
      });
      return NextResponse.json({ ok: true, provider: 'gmail' });
    }

    return NextResponse.json(
      { error: 'No email provider configured. Set RESEND_API_KEY, SMTP_HOST/USER/PASS, or GMAIL_USER/GMAIL_APP_PASSWORD.' },
      { status: 503 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
