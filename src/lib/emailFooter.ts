export type BodyLang = 'de' | 'en' | 'ar';

export function detectBodyLang(body: string): BodyLang {
  if (/[؀-ۿ]/.test(body)) return 'ar';
  if (/Dear |Hello |Hi,|Best regards|regards/i.test(body)) return 'en';
  return 'de';
}

export function unsubscribeFooter(leadId: string, lang: BodyLang, baseUrl: string): string {
  const url = `${baseUrl}/api/public/unsubscribe?id=${encodeURIComponent(leadId)}&lang=${lang}`;
  if (lang === 'de') return `\n\nAbmelden (ein Klick genügt): ${url}`;
  if (lang === 'ar') return `\n\nإلغاء الاشتراك بنقرة واحدة: ${url}`;
  return `\n\nOne-click unsubscribe: ${url}`;
}
