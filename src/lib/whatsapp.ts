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
  const primaryReason = reasons[0] ?? 'Ihre Online-Präsenz noch Potenzial hat';
  return (
    `Hallo ${businessName},\n\n` +
    `ich habe Ihr Unternehmen auf Google Maps gefunden und gesehen, dass ${primaryReason}.\n\n` +
    `Als Webentwickler und Low-Code-Spezialist helfe ich lokalen Unternehmen dabei, mehr Kunden online zu gewinnen – ` +
    `schnell und kosteneffizient. Ich würde Ihnen gerne eine kostenlose Analyse Ihrer Online-Präsenz anbieten.\n\n` +
    `Hätten Sie kurz Zeit für ein Gespräch?\n\n` +
    `Viele Grüße`
  );
}
