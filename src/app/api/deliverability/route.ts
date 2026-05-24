import { NextResponse } from 'next/server';
import dns from 'dns/promises';

const DOMAIN = 'omarrageh.de';
const DKIM_SELECTOR = 'resend'; // Resend uses "resend._domainkey.<domain>"

async function checkSpf(): Promise<{ pass: boolean; record: string | null }> {
  try {
    const records = await dns.resolveTxt(DOMAIN);
    const spf = records.flat().find((r) => r.startsWith('v=spf1'));
    return { pass: !!spf, record: spf ?? null };
  } catch {
    return { pass: false, record: null };
  }
}

async function checkDkim(): Promise<{ pass: boolean; record: string | null }> {
  try {
    const records = await dns.resolveTxt(`${DKIM_SELECTOR}._domainkey.${DOMAIN}`);
    const dkim = records.flat().find((r) => r.includes('p='));
    return { pass: !!dkim, record: dkim ?? null };
  } catch {
    return { pass: false, record: null };
  }
}

async function checkDmarc(): Promise<{ pass: boolean; record: string | null }> {
  try {
    const records = await dns.resolveTxt(`_dmarc.${DOMAIN}`);
    const dmarc = records.flat().find((r) => r.startsWith('v=DMARC1'));
    return { pass: !!dmarc, record: dmarc ?? null };
  } catch {
    return { pass: false, record: null };
  }
}

export async function GET() {
  const [spf, dkim, dmarc] = await Promise.all([checkSpf(), checkDkim(), checkDmarc()]);
  const allPass = spf.pass && dkim.pass && dmarc.pass;
  return NextResponse.json(
    { domain: DOMAIN, spf, dkim, dmarc, allPass },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
