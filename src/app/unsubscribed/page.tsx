interface Props {
  searchParams: Promise<{ lang?: string; name?: string; error?: string }>;
}

export default async function UnsubscribedPage({ searchParams }: Props) {
  const { lang = 'en', name, error } = await searchParams;
  const business = name ? decodeURIComponent(name) : null;

  const copy = {
    de: {
      icon: error ? '!' : null,
      heading: error ? 'Link ungültig' : 'Abgemeldet',
      body: error
        ? 'Dieser Link ist leider nicht mehr gültig.'
        : `${business ? `${business} ist` : 'Sie sind'} aus unserem Verteiler entfernt. Sie erhalten keine weiteren E-Mails von uns.`,
      sub: error ? null : 'Falls Sie sich versehentlich abgemeldet haben, können Sie uns einfach antworten.',
    },
    ar: {
      icon: error ? '!' : null,
      heading: error ? 'رابط غير صالح' : 'تم إلغاء الاشتراك',
      body: error
        ? 'هذا الرابط لم يعد صالحاً.'
        : `تم إزالة ${business ?? 'بريدكم الإلكتروني'} من قائمتنا. لن تتلقوا أي رسائل أخرى منا.`,
      sub: error ? null : 'إذا كان ذلك خطأً، فقط ردّوا على أي رسالة منا.',
    },
    en: {
      icon: error ? '!' : null,
      heading: error ? 'Invalid link' : 'Unsubscribed',
      body: error
        ? 'This link is no longer valid.'
        : `${business ? `${business} has` : 'You have'} been removed from our outreach list. You won't receive any more emails from us.`,
      sub: error ? null : 'If this was a mistake, just reply to any of our emails.',
    },
  };

  const l = (lang === 'de' || lang === 'ar') ? lang : 'en';
  const t = copy[l];
  const isRtl = l === 'ar';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#020609',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: error ? '#1c0707' : '#052e16',
            border: `1px solid ${error ? '#7f1d1d' : '#166534'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          {error ? (
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : (
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#f1f5f9',
            marginBottom: '12px',
            letterSpacing: '-0.02em',
          }}
        >
          {t.heading}
        </h1>

        {/* Body */}
        <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, marginBottom: t.sub ? '12px' : '0' }}>
          {t.body}
        </p>

        {t.sub && (
          <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
            {t.sub}
          </p>
        )}

        {/* Brand */}
        <div style={{ marginTop: '40px', color: '#1e293b', fontSize: '11px', letterSpacing: '0.04em' }}>
          LeadFinder · omar@omarrageh.de
        </div>
      </div>
    </div>
  );
}
