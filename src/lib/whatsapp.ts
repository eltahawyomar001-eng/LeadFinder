import type { PitchLang, Country } from '@/types';

export interface PitchContext {
  name: string;
  lang: PitchLang;
  country: Country;
  builder?: string | null;
  noWebsite?: boolean;
  hasViewport?: boolean;
  isHttps?: boolean;
  pageTitle?: string | null;
  metaDescription?: string | null;
  reasons: string[];
}

// Deterministic variant selection — same business always gets same pitch variation
function pick(seed: string, n: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % n;
}

// Pull the most descriptive snippet from page meta for personalization
function businessHint(ctx: PitchContext): string {
  const desc = ctx.metaDescription ?? ctx.pageTitle ?? '';
  // Strip the business name from the hint to avoid "Müller - Müller salon" type repetition
  const stripped = desc.replace(new RegExp(ctx.name, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
  return stripped.length > 20 ? stripped : '';
}

// ─── Legal compliance footers ─────────────────────────────────────────────────
// Required by: DE (§7 UWG — strongly recommended), UK (PECR — required),
// US (CAN-SPAM — required, must include physical address), SA/AE (good practice)
function legalFooter(country: Country, lang: PitchLang): string {
  if (lang === 'de') {
    return '\n\nWenn Sie keine weiteren Nachrichten erhalten möchten, reicht eine kurze Antwort auf diese E-Mail.';
  }
  if (lang === 'ar') {
    return '\n\nإذا كنتم لا ترغبون في تلقي رسائل مستقبلية، يُرجى الرد على هذا البريد وسأزيل بياناتكم فوراً.';
  }
  // English — US requires physical address under CAN-SPAM
  if (country === 'us') {
    return '\n\nTo unsubscribe from future emails, reply \'unsubscribe\'.\nOmar Rageh · Fulda, Germany 36037';
  }
  return '\n\nIf you\'d prefer not to hear from me again, reply with \'remove\' and I\'ll delete your details immediately.';
}

// ─── GERMAN pitches ───────────────────────────────────────────────────────────

function pitchDE(ctx: PitchContext): { subject: string; body: string } {
  const { name, builder, noWebsite, hasViewport } = ctx;
  const hint = businessHint(ctx);
  const v = pick(name, 3);
  const footer = legalFooter(ctx.country, 'de');

  if (noWebsite) {
    const subjects = [
      `Jemand hat „${name}" gegoogelt — nichts gefunden`,
      `${name} — Website fehlt noch`,
      `Ihre Online-Sichtbarkeit — kurze Frage`,
    ];
    const bodies = [
      `Das passiert täglich: Jemand hört von Ihnen, sucht online — und landet bei der Konkurrenz.\n\n` +
      (hint ? `${hint} — ` : '') +
      `Mit einer professionellen Website fangen Sie genau diese Anfragen ab, bevor sie weiterziehen.\n\n` +
      `Ich entwickle schnelle, mobiloptimierte Unternehmenswebsites mit Next.js. ` +
      `Keine Agentur, kein Abo, kein Baukasten — eine echte Seite, die bei Google gefunden wird. ` +
      `In der Regel in einer Woche live.\n\n` +
      `Meine bisherigen Arbeiten: omar-portfolio.xyz\n\n` +
      `Hätten Sie nächste Woche 10 Minuten Zeit für ein kurzes Gespräch?\n\n` +
      `Omar Rageh\nomarragehfulda@gmail.com · +49 176 55093674` + footer,

      `Ihre Arbeit verdient es, gefunden zu werden.\n\n` +
      (hint ? `${hint} klingt nach einem Angebot, für das es echte Nachfrage gibt. ` : '') +
      `Ohne Website landet diese Nachfrage bei jemand anderem.\n\n` +
      `Ich baue professionelle Websites für lokale Unternehmen — ` +
      `Next.js, schnell, für Google optimiert, auf jedem Gerät sauber. ` +
      `Einmaliger Festpreis, keine laufenden Kosten.\n\n` +
      `Referenzen: omar-portfolio.xyz\n\n` +
      `Wäre ein kurzes Gespräch diese Woche möglich?\n\n` +
      `Omar Rageh · +49 176 55093674` + footer,

      `Wie viele Anfragen verlieren Sie monatlich, weil Interessenten Sie online nicht finden?\n\n` +
      `Ich helfe Unternehmen wie Ihrem dabei, ` +
      `genau dieses Problem zu lösen — mit einer professionellen Website, ` +
      `die bei Google sichtbar ist und auf Mobilgeräten einwandfrei läuft. ` +
      `Fertig in rund einer Woche.\n\n` +
      `Meine Arbeiten: omar-portfolio.xyz\n\n` +
      `10 Minuten diese Woche — würde das passen?\n\n` +
      `Omar Rageh · +49 176 55093674` + footer,
    ];
    return { subject: subjects[v], body: bodies[v] };
  }

  if (builder) {
    const subjects = [
      `Ihre ${builder}-Seite — ich hab kurz reingeschaut`,
      `${name} — ${builder} hat Grenzen, die Sie wahrscheinlich kennen`,
      `Re: ${name} — Ihre Website`,
    ];
    const mobileNote = hasViewport === false ? ` Auf Mobilgeräten lädt sie spürbar langsam.` : '';
    const bodies = [
      `${builder}-Seiten haben ein strukturelles Problem:` + mobileNote +
      ` Sie werden von Google schlechter bewertet als individuell entwickelte Sites ` +
      `und sehen aus wie hunderte andere Seiten in Ihrer Branche.\n\n` +
      (hint ? `Ihr Angebot — ${hint} — verdient eine Seite, die das auch so zeigt.\n\n` : '') +
      `Ich ersetze ${builder}-Setups durch maßgeschneiderte Next.js-Entwicklungen. ` +
      `Gleiche Inhalte, komplett andere Performance und Auffindbarkeit. ` +
      `Meist in einer Woche fertig, zu einem klaren Festpreis.\n\n` +
      `Referenzen: omar-portfolio.xyz\n\n` +
      `Kurzes Gespräch diese Woche?\n\n` +
      `Omar Rageh · +49 176 55093674` + footer,

      `${builder} war ein sinnvoller Einstieg — aber für langfristige Google-Sichtbarkeit ` +
      `und saubere Mobildarstellung ist er eine echte Bremse.\n\n` +
      `Ich baue professionelle Websites, die genau diese Probleme lösen. ` +
      `Next.js, schnell, mobiloptimiert, suchmaschinenoptimiert — kein Template.\n\n` +
      `Meine Arbeiten: omar-portfolio.xyz\n\n` +
      `Wäre ein kurzer Austausch interessant?\n\n` +
      `Omar Rageh · +49 176 55093674` + footer,

      `Die ehrliche Einschätzung: Ihre aktuelle ${builder}-Seite kostet Sie Rankings und Anfragen — ` +
      `weil Baukastensysteme von Google systematisch schlechter bewertet werden ` +
      `und die Templates keine echte Differenzierung erlauben.\n\n` +
      `Ich entwickle individuelle Websites, die das ändern. ` +
      `In der Regel in unter einer Woche, zu einem transparenten Festpreis.\n\n` +
      `Portfolio: omar-portfolio.xyz\n\n` +
      `10 Minuten diese Woche — lohnt sich?\n\n` +
      `Omar Rageh · +49 176 55093674` + footer,
    ];
    return { subject: subjects[v], body: bodies[v] };
  }

  // Generic / few reviews / mobile-only issue
  const subjects = [
    `Mehr Anfragen für ${name} — konkreter Vorschlag`,
    `${name} — Ihre Online-Präsenz hat Potenzial`,
    `Kurze Frage zu ${name}`,
  ];
  const bodies = [
    (hint ? `${hint} — ` : '') +
    `Ihre Online-Präsenz hat Potenzial, das noch nicht ausgeschöpft ist.\n\n` +
    `Ich helfe lokalen Unternehmen dabei, bei Google besser sichtbar zu werden ` +
    `und mehr Anfragen zu generieren — durch professionelle Websites mit Next.js, ` +
    `die schnell laden und auf jedem Gerät funktionieren.\n\n` +
    `Meine Arbeiten: omar-portfolio.xyz\n\n` +
    `Wäre ein kurzes Gespräch diese Woche möglich?\n\n` +
    `Omar Rageh · +49 176 55093674` + footer,

    `Ich bin auf ${name} gestoßen und denke, ich kann konkret helfen — ` +
    `ob durch eine neue Website, eine Überarbeitung des bestehenden Auftritts ` +
    `oder gezielte Performance-Optimierungen.\n\n` +
    `Meine Arbeiten: omar-portfolio.xyz\n\n` +
    `10 Minuten diese Woche?\n\n` +
    `Omar Rageh · +49 176 55093674` + footer,

    `Für Unternehmen${hint ? ` wie „${hint}"` : ''} ist die Lücke zwischen ` +
    `einer durchschnittlichen und einer starken Online-Präsenz oft kleiner als gedacht — ` +
    `und der Unterschied bei den eingehenden Anfragen ist erheblich.\n\n` +
    `Ich entwickle Websites, die diesen Unterschied machen. Referenzen: omar-portfolio.xyz\n\n` +
    `Hätten Sie Zeit für ein kurzes Gespräch?\n\n` +
    `Omar Rageh · +49 176 55093674` + footer,
  ];
  return { subject: subjects[v], body: bodies[v] };
}

// ─── ENGLISH pitches ──────────────────────────────────────────────────────────

function pitchEN(ctx: PitchContext): { subject: string; body: string } {
  const { name, builder, noWebsite, hasViewport } = ctx;
  const hint = businessHint(ctx);
  const v = pick(name, 3);
  const footer = legalFooter(ctx.country, 'en');

  if (noWebsite) {
    const subjects = [
      `Quick question about ${name}`,
      `${name} — no website yet`,
      `Found your business — couldn't find your website`,
    ];
    const bodies = [
      `Someone looks you up after a recommendation — finds nothing. That referral goes to whoever shows up on Google.\n\n` +
      (hint ? `${hint} sounds like something people actively search for. ` : '') +
      `A proper website channels that intent directly to you.\n\n` +
      `I build fast, mobile-first business websites with Next.js — ` +
      `designed to rank, ready in about a week, one fixed price with no monthly fees.\n\n` +
      `Recent work: omar-portfolio.xyz\n\n` +
      `Would a 10-minute call this week make sense?\n\n` +
      `Omar Rageh · omarragehfulda@gmail.com · +49 176 55093674` + footer,

      `You're building your business on reputation. Online, that reputation is invisible.\n\n` +
      (hint ? `${hint} — ` : '') +
      `I specialize in websites for small businesses: Next.js, properly designed, built to rank on Google. ` +
      `One-off price, nothing recurring. Usually live in under a week.\n\n` +
      `My work: omar-portfolio.xyz\n\n` +
      `Worth a quick conversation?\n\n` +
      `Omar Rageh · +49 176 55093674` + footer,

      `There's real demand for what you do. A website channels it toward you instead of your competitors.\n\n` +
      (hint ? `Based on what I can see — ${hint} — ` : ``) +
      `I'd build you something fast, clean, and visible on Google. Done in under a week.\n\n` +
      `Portfolio: omar-portfolio.xyz\n\n` +
      `10 minutes this week to talk through what you'd need?\n\n` +
      `Omar Rageh · +49 176 55093674` + footer,
    ];
    return { subject: subjects[v], body: bodies[v] };
  }

  if (builder) {
    const mobileNote = hasViewport === false ? ` It's also not rendering properly on mobile.` : '';
    const subjects = [
      `Your ${builder} site — a quick observation`,
      `${name} — re: your website`,
      `${builder} is limiting you — here's what I'd do instead`,
    ];
    const bodies = [
      `Your ${builder} site is visible, which is a start — but it's working against you in a few specific ways: ` +
      `slower mobile load, lower Google ranking potential, and a template that makes you look identical to competitors.${mobileNote}\n\n` +
      (hint ? `${hint} deserves a site that actually reflects it.\n\n` : '') +
      `I replace ${builder} setups with custom Next.js builds. Same content, dramatically better performance and rankings. ` +
      `Done in under a week, transparent fixed price.\n\n` +
      `Portfolio: omar-portfolio.xyz\n\n` +
      `Would a 10-minute call this week work?\n\n` +
      `Omar Rageh · +49 176 55093674` + footer,

      `Honest take: ${builder} got you online fast, but it's putting a ceiling on your Google visibility and mobile performance.\n\n` +
      `I build proper sites — fast, custom, mobile-optimized. Not another template. Usually done in less than a week.\n\n` +
      `Recent work: omar-portfolio.xyz\n\n` +
      `Open to a quick call?\n\n` +
      `Omar Rageh · +49 176 55093674` + footer,

      `${builder} sites share infrastructure with thousands of others — ` +
      `which means Google treats them as lower authority and they load slower on mobile than custom builds.${mobileNote}\n\n` +
      `I swap them out for Next.js sites that rank better and load in under a second. One fixed price.\n\n` +
      `My work: omar-portfolio.xyz\n\n` +
      `10 minutes to show you what's possible?\n\n` +
      `Omar Rageh · +49 176 55093674` + footer,
    ];
    return { subject: subjects[v], body: bodies[v] };
  }

  const subjects = [
    `More enquiries for ${name} — a specific idea`,
    `${name} — your online presence has headroom`,
    `Quick thought on ${name}'s website`,
  ];
  const bodies = [
    (hint ? `${hint} — ` : '') +
    `there's a gap between your current online presence and what it could be driving for you.\n\n` +
    `I help businesses like yours close that gap — through fast, properly built websites that rank on Google ` +
    `and work flawlessly on mobile.\n\n` +
    `My work: omar-portfolio.xyz\n\n` +
    `Would a short call this week be useful?\n\n` +
    `Omar Rageh · +49 176 55093674` + footer,

    `I came across ${name} and think I can help — whether that's a new site, a proper redesign, ` +
    `or targeted performance improvements.\n\n` +
    `My work: omar-portfolio.xyz\n\n` +
    `10 minutes this week?\n\n` +
    `Omar Rageh · +49 176 55093674` + footer,

    `For a business${hint ? ` doing "${hint}"` : ` like yours`}, ` +
    `the difference between an average and a strong web presence often comes down to a few specific technical decisions — ` +
    `and the impact on inbound enquiries is significant.\n\n` +
    `I build websites that make that difference. Portfolio: omar-portfolio.xyz\n\n` +
    `Worth 10 minutes?\n\n` +
    `Omar Rageh · +49 176 55093674` + footer,
  ];
  return { subject: subjects[v], body: bodies[v] };
}

// ─── ARABIC pitches ───────────────────────────────────────────────────────────

function pitchAR(ctx: PitchContext): { subject: string; body: string } {
  const { name, builder, noWebsite, hasViewport } = ctx;
  const hint = businessHint(ctx);
  const v = pick(name, 3);
  const footer = legalFooter(ctx.country, 'ar');

  if (noWebsite) {
    const subjects = [
      `سؤال سريع بخصوص ${name}`,
      `${name} — لماذا لا يجدكم العملاء؟`,
      `${name} — غياب الموقع يكلّف`,
    ];
    const bodies = [
      `عندما يبحث أحد عن ${name} ويجد صفحة فارغة، تذهب فرصة العمل إلى المنافس الأول في النتائج.\n\n` +
      (hint ? `${hint} — ` : '') +
      `هذا النوع من الخدمات يحظى بطلب حقيقي على الإنترنت. موقع احترافي يُوجّه هذا الطلب إليكم مباشرةً.\n\n` +
      `أبني مواقع إلكترونية للشركات الصغيرة والمتوسطة — سريعة، متوافقة مع الجوال، مُحسَّنة لمحركات البحث. ` +
      `عادةً تكون جاهزة خلال أسبوع واحد بسعر ثابت بدون اشتراكات شهرية.\n\n` +
      `أعمالي السابقة: omar-portfolio.xyz\n\n` +
      `هل يمكننا تحديد موعد لمكالمة قصيرة هذا الأسبوع؟\n\n` +
      `عمر راجح · omarragehfulda@gmail.com · +49 176 55093674` + footer,

      `كل يوم لا يجد فيه عميل محتمل موقعكم الإلكتروني، هو يوم تخسرون فيه عملاً.\n\n` +
      (hint ? `${hint} — ` : '') +
      `أصمم مواقع احترافية بتقنية Next.js لا تبدو مثل القوالب الجاهزة — ` +
      `سريعة، تظهر في جوجل، تعمل بكفاءة على الجوال.\n\n` +
      `أعمالي: omar-portfolio.xyz\n\n` +
      `عشر دقائق هذا الأسبوع تكفي — هل يناسبكم؟\n\n` +
      `عمر راجح · +49 176 55093674` + footer,

      `الشركات التي لا تمتلك مواقع إلكترونية تخسر ما يصل إلى 60% من العملاء المحتملين الذين يبحثون أولاً على الإنترنت.\n\n` +
      `أبني مواقع تُغلق هذه الفجوة — بتصميم احترافي وسرعة حقيقية وحضور قوي في جوجل. ` +
      `سعر واحد واضح، بدون مفاجآت.\n\n` +
      `محفظة أعمالي: omar-portfolio.xyz\n\n` +
      `هل نتحدث هذا الأسبوع؟\n\n` +
      `عمر راجح · +49 176 55093674` + footer,
    ];
    return { subject: subjects[v], body: bodies[v] };
  }

  if (builder) {
    const mobileNote = hasViewport === false ? ` فضلاً عن أنه لا يعمل بشكل صحيح على الأجهزة المحمولة.` : '';
    const subjects = [
      `موقع ${name} — ملاحظة سريعة`,
      `${builder} يعيق نموكم — إليكم البديل`,
      `${name} — الموقع الحالي يحدّ من إمكانياتكم`,
    ];
    const bodies = [
      `موقعكم على ${builder} يُنجز مهمته، لكنه يعمل ضدكم في جوانب محددة: ` +
      `سرعة تحميل أضعف على الجوال، تقييم أدنى من جوجل، وقالب يجعلكم تبدون مثل عشرات المنافسين.${mobileNote}\n\n` +
      (hint ? `${hint} يستحق موقعاً يعكسه بالفعل.\n\n` : '') +
      `أحوّل مواقع ${builder} إلى مواقع مبنية بـ Next.js — نفس المحتوى، أداء مختلف تماماً، ` +
      `وتصميم يخصكم وحدكم. عادةً في أسبوع واحد بسعر ثابت.\n\n` +
      `أعمالي: omar-portfolio.xyz\n\n` +
      `مكالمة قصيرة هذا الأسبوع؟\n\n` +
      `عمر راجح · +49 176 55093674` + footer,

      `${builder} كان خياراً منطقياً للبداية — لكنه يضع سقفاً على ظهوركم في جوجل وأداءكم على الجوال.\n\n` +
      `أبني مواقع احترافية تحل هذه المشكلات بالتحديد — Next.js، سريعة، مُحسَّنة لمحركات البحث، بدون قوالب جاهزة.\n\n` +
      `أعمالي: omar-portfolio.xyz\n\n` +
      `هل يستحق الأمر محادثة قصيرة؟\n\n` +
      `عمر راجح · +49 176 55093674` + footer,

      `مواقع ${builder} تشترك في بنية تحتية مع آلاف المواقع الأخرى — ` +
      `مما يجعل جوجل يتعامل معها كمصادر منخفضة السلطة وتتحمل أوقات تحميل أبطأ من المواقع المخصصة.${mobileNote}\n\n` +
      `أستبدل هذه المواقع بمواقع Next.js تُحمَّل في أقل من ثانية وتُرتَّب بشكل أفضل. سعر ثابت واحد.\n\n` +
      `محفظة أعمالي: omar-portfolio.xyz\n\n` +
      `عشر دقائق لأريكم الممكن؟\n\n` +
      `عمر راجح · +49 176 55093674` + footer,
    ];
    return { subject: subjects[v], body: bodies[v] };
  }

  const subjects = [
    `المزيد من العملاء لـ ${name} — فكرة محددة`,
    `${name} — حضوركم الرقمي يمتلك إمكانيات أكبر`,
    `ملاحظة سريعة على موقع ${name}`,
  ];
  const bodies = [
    (hint ? `${hint} — ` : '') +
    `هناك فجوة بين حضوركم الرقمي الحالي وما يمكن أن يُحققه لكم.\n\n` +
    `أساعد الشركات على سد هذه الفجوة — من خلال مواقع إلكترونية سريعة ومُصممة بشكل صحيح ` +
    `تظهر في جوجل وتعمل بسلاسة على الجوال.\n\n` +
    `أعمالي: omar-portfolio.xyz\n\n` +
    `هل تفيدكم مكالمة قصيرة هذا الأسبوع؟\n\n` +
    `عمر راجح · +49 176 55093674` + footer,

    `وجدت ${name} وأعتقد أنني أستطيع المساعدة — سواء في موقع جديد أو إعادة تصميم كاملة ` +
    `أو تحسينات أداء مُحددة.\n\n` +
    `أعمالي: omar-portfolio.xyz\n\n` +
    `عشر دقائق هذا الأسبوع؟\n\n` +
    `عمر راجح · +49 176 55093674` + footer,

    `لشركة${hint ? ` مثل "${hint}"` : ` في هذا المجال`}، ` +
    `الفرق بين حضور رقمي متوسط وحضور قوي يتعلق غالباً ببضعة قرارات تقنية محددة — ` +
    `وتأثيرها على الاستفسارات الواردة يكون ملحوظاً جداً.\n\n` +
    `أبني مواقع تُحدث هذا الفرق. محفظة أعمالي: omar-portfolio.xyz\n\n` +
    `يستحق الأمر عشر دقائق؟\n\n` +
    `عمر راجح · +49 176 55093674` + footer,
  ];
  return { subject: subjects[v], body: bodies[v] };
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function generateEmailPitch(
  businessName: string,
  reasons: string[],
  lang: PitchLang = 'de',
  country: Country = 'de',
  extra?: Partial<PitchContext>,
): { subject: string; body: string } {
  const ctx: PitchContext = {
    name: businessName,
    lang,
    country,
    reasons,
    noWebsite: reasons.some((r) => r.includes('keine eigene Website') || r.includes('no website')),
    ...extra,
  };
  if (lang === 'ar') return pitchAR(ctx);
  if (lang === 'en') return pitchEN(ctx);
  return pitchDE(ctx);
}

// ── Legacy helpers kept for backward compatibility ────────────────────────────

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
  if (cleaned.startsWith('+49')) cleaned = cleaned.slice(1);
  else if (cleaned.startsWith('0049')) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith('0')) cleaned = '49' + cleaned.slice(1);
  if (!/^\d{10,15}$/.test(cleaned)) return null;
  return `https://wa.me/${cleaned}`;
}

export function generateWhatsAppMessage(businessName: string, reasons: string[]): string {
  return generateEmailPitch(businessName, reasons, 'de', 'de').body;
}
