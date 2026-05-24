import { NextResponse } from 'next/server';
import dns from 'dns/promises';

// Domain-based blocklists
const DOMAIN_LISTS = [
  { name: 'Spamhaus DBL', host: 'dbl.spamhaus.org' },
  { name: 'SURBL', host: 'multi.surbl.org' },
  { name: 'URIBL', host: 'multi.uribl.com' },
  { name: 'Spamhaus ZEN', host: 'zen.spamhaus.org' },
];

async function checkDomainBL(domain: string, bl: string): Promise<boolean> {
  try {
    const query = `${domain}.${bl}`;
    await dns.resolve4(query);
    return true; // Listed
  } catch {
    return false;
  }
}

export async function GET() {
  const domain = 'omarrageh.de';

  const results = await Promise.all(
    DOMAIN_LISTS.map(async (bl) => {
      const listed = await checkDomainBL(domain, bl.host);
      return { name: bl.name, host: bl.host, listed };
    })
  );

  const anyListed = results.some((r) => r.listed);

  return NextResponse.json(
    { domain, results, anyListed },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
