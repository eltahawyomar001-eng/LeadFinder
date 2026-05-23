type PitchLang = 'de' | 'en' | 'ar';

function pitchDE(businessName: string, reasons: string[]): { subject: string; body: string } {
  const noWebsite = reasons.some((r) => r.includes('keine eigene Website'));
  const badBuilder = reasons.some((r) => r.includes('Baukasten'));
  const notMobile = reasons.some((r) => r.includes('mobiloptimiert'));
  const fewReviews = reasons.some((r) => r.includes('Bewertungen'));
  const needsUpgrade = badBuilder || notMobile;

  let body: string;
  if (noWebsite) {
    body =
      `Sehr geehrte Damen und Herren,\n\n` +
      `mein Name ist Omar Rageh – ich bin Full-Stack-Entwickler aus Fulda und spezialisiert auf ` +
      `moderne Unternehmenswebsites mit Next.js, React und Tailwind CSS.\n\n` +
      `Ich bin auf Ihr Unternehmen „${businessName}" aufmerksam geworden und habe festgestellt, ` +
      `dass Sie noch keine eigene Website haben. In der heutigen Zeit verlieren Unternehmen ohne ` +
      `Online-Präsenz täglich potenzielle Kunden, die gezielt im Internet nach Ihren Leistungen suchen.\n\n` +
      `Was ich Ihnen anbieten kann:\n` +
      `• Schnelle, mobiloptimierte Website – fertig in wenigen Tagen\n` +
      `• Auffindbarkeit bei Google (SEO-Grundoptimierung inklusive)\n` +
      `• Transparente Festpreise – keine versteckten Kosten\n` +
      `• Persönlicher Ansprechpartner vor Ort in Hessen\n\n` +
      `Meine bisherigen Arbeiten finden Sie unter: omar-portfolio.xyz\n\n` +
      `Ich würde mich freuen, Ihnen in einem kurzen Gespräch zu zeigen, was ich konkret für Sie umsetzen kann – ` +
      `selbstverständlich kostenlos und unverbindlich.\n\n` +
      `Mit freundlichen Grüßen,\n\nOmar Rageh\n` +
      `Full-Stack Developer & Automation Builder\n` +
      `omarragehfulda@gmail.com\n` +
      `+49 176 55093674\n` +
      `omar-portfolio.xyz`;
  } else if (needsUpgrade) {
    body =
      `Sehr geehrte Damen und Herren,\n\n` +
      `mein Name ist Omar Rageh – Full-Stack-Entwickler aus Fulda, spezialisiert auf professionelle ` +
      `Unternehmenswebsites mit Next.js und React.\n\n` +
      `Ich bin auf Ihr Unternehmen „${businessName}" aufmerksam geworden. Ihre aktuelle Website hat noch ` +
      `erhebliches Verbesserungspotenzial – besonders bei der mobilen Darstellung und der Ladegeschwindigkeit. ` +
      `Eine professionelle, moderne Website kann Ihnen deutlich mehr Anfragen und Vertrauen bei neuen Kunden bringen.\n\n` +
      `Was ich konkret anbiete:\n` +
      `• Komplett neue, schnelle Website mit Next.js & React\n` +
      `• Vollständig mobiloptimiert und Google-ready\n` +
      `• SSL, strukturierte Daten, SEO-Grundoptimierung inklusive\n` +
      `• Klarer, fairer Festpreis – kein Abo, keine Folgekosten\n\n` +
      `Referenzen: omar-portfolio.xyz\n\n` +
      `Wäre ein kurzes, kostenloses Gespräch möglich? Ich zeige Ihnen konkret, was ich für Sie tun kann.\n\n` +
      `Mit freundlichen Grüßen,\n\nOmar Rageh\n` +
      `omarragehfulda@gmail.com · +49 176 55093674 · omar-portfolio.xyz`;
  } else if (fewReviews) {
    body =
      `Sehr geehrte Damen und Herren,\n\n` +
      `mein Name ist Omar Rageh – Webentwickler aus Fulda. Ich helfe lokalen Unternehmen dabei, ` +
      `ihre Sichtbarkeit im Internet gezielt zu verbessern.\n\n` +
      `Ich habe Ihr Unternehmen „${businessName}" gefunden und gesehen, dass Ihre Online-Präsenz ` +
      `noch Potenzial hat. Mit einer professionellen, modernen Website können Sie deutlich mehr Neukunden gewinnen.\n\n` +
      `Was ich konkret anbiete:\n` +
      `• Neue oder überarbeitete Website mit Next.js & React\n` +
      `• Bessere Auffindbarkeit bei Google-Suchen in Ihrer Region\n` +
      `• Klare Kommunikation Ihrer Leistungen an die richtigen Kunden\n\n` +
      `Referenzen: omar-portfolio.xyz\n\n` +
      `Wäre ein kurzes, kostenloses Gespräch möglich?\n\n` +
      `Mit freundlichen Grüßen,\n\nOmar Rageh\n` +
      `omarragehfulda@gmail.com · +49 176 55093674 · omar-portfolio.xyz`;
  } else {
    body =
      `Sehr geehrte Damen und Herren,\n\n` +
      `mein Name ist Omar Rageh – Full-Stack-Entwickler aus Fulda, spezialisiert auf moderne ` +
      `Websites und Web-Applikationen für lokale Unternehmen.\n\n` +
      `Ich bin auf „${businessName}" aufmerksam geworden und würde Ihnen gerne zeigen, ` +
      `wie ich Ihre Online-Präsenz weiter stärken kann.\n\n` +
      `Meine Arbeiten: omar-portfolio.xyz\n\n` +
      `Ich freue mich auf Ihre Rückmeldung.\n\n` +
      `Mit freundlichen Grüßen,\n\nOmar Rageh\n` +
      `omarragehfulda@gmail.com · +49 176 55093674 · omar-portfolio.xyz`;
  }

  const subject = noWebsite
    ? `Professionelle Website für ${businessName} – Angebot von Omar Rageh`
    : needsUpgrade
    ? `Ihre Website hat Potenzial – professionelles Upgrade für ${businessName}`
    : `Mehr Kunden online gewinnen – Webentwicklung für ${businessName}`;

  return { subject, body };
}

function pitchEN(businessName: string, reasons: string[]): { subject: string; body: string } {
  const noWebsite = reasons.some((r) =>
    r.includes('no website') || r.includes('keine eigene Website') || r.includes('Website'));
  const badBuilder = reasons.some((r) => r.includes('builder') || r.includes('Baukasten'));
  const notMobile = reasons.some((r) => r.includes('mobile') || r.includes('mobiloptimiert'));
  const needsUpgrade = badBuilder || notMobile;

  let body: string;
  if (noWebsite && !needsUpgrade) {
    body =
      `Dear ${businessName} Team,\n\n` +
      `My name is Omar Rageh — I'm a full-stack web developer based in Germany, specialized in building ` +
      `modern, fast business websites using Next.js, React, and Tailwind CSS.\n\n` +
      `I came across your business and noticed you don't have a website yet. ` +
      `Without an online presence, you're missing out on customers who search for your services every day.\n\n` +
      `What I can offer you:\n` +
      `• Fast, mobile-first website — ready in days, not months\n` +
      `• Google visibility with basic SEO included\n` +
      `• Transparent fixed pricing — no hidden fees, no monthly subscriptions\n` +
      `• Direct, personal communication throughout the project\n\n` +
      `See my previous work at: omar-portfolio.xyz\n\n` +
      `I'd love to show you exactly what I can build for you — a free, no-obligation conversation is all it takes.\n\n` +
      `Best regards,\nOmar Rageh\n` +
      `Full-Stack Developer & Automation Builder\n` +
      `omarragehfulda@gmail.com\n` +
      `+49 176 55093674\n` +
      `omar-portfolio.xyz`;
  } else if (needsUpgrade) {
    body =
      `Dear ${businessName} Team,\n\n` +
      `My name is Omar Rageh — a full-stack web developer based in Germany, specialized in ` +
      `Next.js, React, and Tailwind CSS.\n\n` +
      `I came across your business online. Your current website has significant room for improvement — ` +
      `particularly around mobile responsiveness and performance. A professionally built site can meaningfully ` +
      `increase trust with new customers and drive more enquiries.\n\n` +
      `What I can deliver:\n` +
      `• Brand-new, fast website with Next.js & React\n` +
      `• Fully mobile-optimized, Google-ready\n` +
      `• SSL, structured data, SEO basics included\n` +
      `• One clear fixed price — no subscriptions, no surprises\n\n` +
      `Portfolio: omar-portfolio.xyz\n\n` +
      `Would you be open to a quick, free call? I'll show you exactly what I'd build.\n\n` +
      `Best regards,\nOmar Rageh\n` +
      `omarragehfulda@gmail.com · +49 176 55093674 · omar-portfolio.xyz`;
  } else {
    body =
      `Dear ${businessName} Team,\n\n` +
      `My name is Omar Rageh — a full-stack developer based in Germany, specialized in modern ` +
      `websites and web applications with Next.js and React.\n\n` +
      `I came across your business and believe I can help strengthen your online presence — ` +
      `whether through a new website, a redesign, or targeted improvements.\n\n` +
      `My work: omar-portfolio.xyz\n\n` +
      `Would you be open to a short conversation?\n\n` +
      `Best regards,\nOmar Rageh\n` +
      `omarragehfulda@gmail.com · +49 176 55093674 · omar-portfolio.xyz`;
  }

  const subject = noWebsite && !needsUpgrade
    ? `Professional website for ${businessName} — Omar Rageh, Web Developer`
    : needsUpgrade
    ? `Your website can do much more — proposal for ${businessName}`
    : `Grow your business online — web development for ${businessName}`;

  return { subject, body };
}

function pitchAR(businessName: string, reasons: string[]): { subject: string; body: string } {
  const noWebsite = reasons.some((r) =>
    r.includes('keine eigene Website') || r.includes('no website') || r.includes('موقع'));
  const badBuilder = reasons.some((r) => r.includes('builder') || r.includes('Baukasten') || r.includes('بنظام'));
  const notMobile = reasons.some((r) => r.includes('mobile') || r.includes('mobiloptimiert') || r.includes('جوال'));
  const needsUpgrade = badBuilder || notMobile;

  let body: string;
  if (noWebsite && !needsUpgrade) {
    body =
      `السادة الكرام،\n\n` +
      `اسمي عمر راجح — مطور ويب متكامل متخصص في بناء مواقع إلكترونية احترافية وسريعة باستخدام ` +
      `Next.js وReact وTailwind CSS.\n\n` +
      `لفت انتباهي عملكم "${businessName}"، ولاحظت أنكم لا تمتلكون موقعًا إلكترونيًا بعد. ` +
      `في ظل التنافس الرقمي اليوم، الشركات التي لا تمتلك حضورًا على الإنترنت تخسر عملاء يبحثون عن خدماتكم يوميًا.\n\n` +
      `ما أستطيع تقديمه لكم:\n` +
      `• موقع سريع ومتوافق مع الجوال — جاهز في أيام قليلة\n` +
      `• ظهور في نتائج جوجل (تحسين SEO أساسي مدرج)\n` +
      `• سعر ثابت وشفاف — بدون رسوم شهرية أو تكاليف مخفية\n` +
      `• تواصل مباشر وشخصي طوال مراحل المشروع\n\n` +
      `يمكنكم الاطلاع على أعمالي السابقة على: omar-portfolio.xyz\n\n` +
      `يسعدني تقديم استشارة مجانية وبدون أي التزام.\n\n` +
      `مع أطيب التحيات،\nعمر راجح\n` +
      `مطور ويب متكامل\n` +
      `omarragehfulda@gmail.com\n` +
      `+49 176 55093674\n` +
      `omar-portfolio.xyz`;
  } else if (needsUpgrade) {
    body =
      `السادة الكرام،\n\n` +
      `اسمي عمر راجح — مطور ويب متكامل متخصص في Next.js وReact وTailwind CSS.\n\n` +
      `اطلعت على موقع "${businessName}" الإلكتروني، ولاحظت أن هناك مجالًا كبيرًا للتحسين — ` +
      `خاصةً من حيث التوافق مع الأجهزة المحمولة والسرعة. موقع احترافي ومتطور يمكن أن يزيد ` +
      `الثقة لدى العملاء الجدد ويرفع معدل الاستفسارات بشكل ملحوظ.\n\n` +
      `ما أقدمه:\n` +
      `• موقع جديد كامل بتقنية Next.js وReact\n` +
      `• متوافق تمامًا مع الجوال وجاهز لمحركات البحث\n` +
      `• SSL وبيانات منظمة وتحسين SEO أساسي مدرجة\n` +
      `• سعر ثابت وواضح — بدون اشتراكات أو مفاجآت\n\n` +
      `أعمالي: omar-portfolio.xyz\n\n` +
      `هل يمكننا تحديد موعد لمكالمة قصيرة ومجانية لأوضح لكم ما يمكنني تقديمه؟\n\n` +
      `مع أطيب التحيات،\nعمر راجح\n` +
      `omarragehfulda@gmail.com · +49 176 55093674 · omar-portfolio.xyz`;
  } else {
    body =
      `السادة الكرام،\n\n` +
      `اسمي عمر راجح — مطور ويب متكامل متخصص في المواقع الإلكترونية الحديثة باستخدام Next.js وReact.\n\n` +
      `لفت انتباهي عملكم "${businessName}"، ويسعدني مساعدتكم في تقوية حضوركم الرقمي — ` +
      `سواء من خلال موقع جديد أو تطوير الموجود أو تحسينات محددة.\n\n` +
      `أعمالي: omar-portfolio.xyz\n\n` +
      `أتطلع إلى تواصلكم.\n\n` +
      `مع أطيب التحيات،\nعمر راجح\n` +
      `omarragehfulda@gmail.com · +49 176 55093674 · omar-portfolio.xyz`;
  }

  const subject = noWebsite && !needsUpgrade
    ? `موقع إلكتروني احترافي لـ ${businessName} — عمر راجح، مطور ويب`
    : needsUpgrade
    ? `موقعكم يستحق تطويرًا احترافيًا — عرض لـ ${businessName}`
    : `نمّوا أعمالكم رقميًا — تطوير ويب لـ ${businessName}`;

  return { subject, body };
}

export function generateEmailPitch(
  businessName: string,
  reasons: string[],
  lang: PitchLang = 'de'
): { subject: string; body: string } {
  if (lang === 'en') return pitchEN(businessName, reasons);
  if (lang === 'ar') return pitchAR(businessName, reasons);
  return pitchDE(businessName, reasons);
}

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
