// German mobile prefixes: 015x, 016x, 017x — these are on WhatsApp
// Landlines (030, 069, 089 etc.) rarely have WhatsApp
export function isMobileNumber(phone: string): boolean {
  if (!phone) return false;
  let local = phone.replace(/[\s\-\(\)\/\.]/g, '');
  if (local.startsWith('+49')) local = '0' + local.slice(3);
  else if (local.startsWith('0049')) local = '0' + local.slice(4);
  else if (local.startsWith('49') && local.length >= 11) local = '0' + local.slice(2);
  return /^0(15[0-9]|16[0-9]|17[0-9])/.test(local);
}

export function formatPhoneForWhatsApp(phone: string): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-\(\)\/\.]/g, '');
  if (cleaned.startsWith('+49')) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith('0049')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = '49' + cleaned.slice(1);
  }
  if (!/^\d{10,15}$/.test(cleaned)) return null;
  return `https://wa.me/${cleaned}`;
}

export function generateWhatsAppMessage(
  businessName: string,
  reasons: string[]
): string {
  const noWebsite = reasons.some((r) => r.includes('keine eigene Website'));
  const fewReviews = reasons.some((r) => r.includes('Bewertungen'));
  const lowRating = reasons.some((r) => r.includes('Bewertung noch verbessert'));

  if (noWebsite) {
    return (
      `Hallo ${businessName},\n\n` +
      `mein Name ist Omar Rageh – ich bin Full-Stack-Entwickler aus Fulda und spezialisiert auf moderne Unternehmenswebsites mit Next.js, React und Tailwind CSS.\n\n` +
      `Ich habe Ihr Unternehmen auf Google Maps entdeckt und gesehen, dass Sie noch keine eigene Website haben. ` +
      `Das kostet Sie täglich potenzielle Kunden, die online nach Ihren Leistungen suchen.\n\n` +
      `Ich entwickle schnelle, mobiloptimierte Websites, die bei Google gefunden werden – ` +
      `innerhalb weniger Tage fertig, zu einem fairen Festpreis.\n\n` +
      `Meine Arbeiten sehen Sie hier: omar-portfolio.xyz\n\n` +
      `Hätten Sie kurz Zeit für ein Gespräch? Ich biete Ihnen gerne eine kostenlose Ersteinschätzung an.\n\n` +
      `Viele Grüße,\nOmar Rageh\n+49 176 55093674`
    );
  }

  if (lowRating) {
    return (
      `Hallo ${businessName},\n\n` +
      `mein Name ist Omar Rageh – Full-Stack-Entwickler aus Fulda, spezialisiert auf Websites und Web-Apps für lokale Unternehmen.\n\n` +
      `Ich habe mir Ihren Google-Auftritt angeschaut und glaube, dass eine moderne, professionelle Website ` +
      `dazu beitragen kann, mehr Vertrauen bei neuen Kunden aufzubauen und Ihre Außendarstellung deutlich zu stärken.\n\n` +
      `Ich baue mit Next.js und Tailwind CSS – schnell, mobil, sauber. Meine bisherigen Projekte:\nomar-portfolio.xyz\n\n` +
      `Darf ich Ihnen zeigen, was ich konkret für Sie umsetzen könnte? Kostenlose Erstberatung, kein Risiko.\n\n` +
      `Viele Grüße,\nOmar Rageh\n+49 176 55093674`
    );
  }

  if (fewReviews) {
    return (
      `Hallo ${businessName},\n\n` +
      `mein Name ist Omar Rageh – ich bin Webentwickler aus Fulda und helfe lokalen Unternehmen dabei, ` +
      `online besser sichtbar zu werden.\n\n` +
      `Ihr Unternehmen ist auf Google Maps zu finden, aber Ihre Online-Präsenz hat noch Luft nach oben. ` +
      `Eine professionelle Website mit klarem Angebot und echten Bewertungen kann Ihren Google-Rang deutlich verbessern.\n\n` +
      `Ich entwickle mit Next.js, React und Tailwind – modern, schnell, für alle Geräte optimiert.\nMeine Projekte: omar-portfolio.xyz\n\n` +
      `Hätten Sie Interesse an einem kurzen, kostenlosen Gespräch?\n\n` +
      `Viele Grüße,\nOmar Rageh\n+49 176 55093674`
    );
  }

  return (
    `Hallo ${businessName},\n\n` +
    `mein Name ist Omar Rageh – Full-Stack-Entwickler aus Fulda, spezialisiert auf moderne Websites und Web-Applikationen mit Next.js und React.\n\n` +
    `Ich habe Ihr Unternehmen auf Google Maps gefunden und denke, dass ich Ihre Online-Präsenz ` +
    `mit einer schnellen, professionellen Website oder einer gezielten Überarbeitung merklich stärken kann.\n\n` +
    `Bisherige Arbeiten: omar-portfolio.xyz\n\n` +
    `Wäre ein kurzes Gespräch möglich? Ich freue mich auf Ihre Rückmeldung.\n\n` +
    `Viele Grüße,\nOmar Rageh\n+49 176 55093674`
  );
}
