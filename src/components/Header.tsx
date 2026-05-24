'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="url(#hdr-grad)" />
      <circle cx="13.5" cy="13.5" r="7" stroke="white" strokeWidth="2" />
      <line x1="18.7" y1="18.7" x2="25" y2="25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="13.5" cy="13.5" r="2.5" fill="white" fillOpacity="0.45" />
      <line x1="10" y1="13.5" x2="17" y2="13.5" stroke="white" strokeWidth="1.1" strokeOpacity="0.45" />
      <line x1="13.5" y1="10" x2="13.5" y2="17" stroke="white" strokeWidth="1.1" strokeOpacity="0.45" />
      <defs>
        <linearGradient id="hdr-grad" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#1e3a8a" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Header() {
  const [replyCount, setReplyCount] = useState(0);

  useEffect(() => {
    fetch('/api/crm/unread')
      .then((r) => r.json())
      .then(({ count }) => setReplyCount(count ?? 0))
      .catch(() => {});
  }, []);

  return (
    <header
      style={{
        borderBottom: '1px solid #0a1628',
        backgroundColor: 'rgba(2, 6, 9, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '0 16px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        {/* Brand */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', minWidth: 0 }}>
          <LogoMark size={32} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1 }}>
              LeadFinder
            </div>
            <div style={{ fontSize: '10px', color: '#1e3a5f', marginTop: '2px', letterSpacing: '0.04em', fontWeight: 600 }}>
              GLOBAL
            </div>
          </div>
        </Link>

        {/* Desktop nav — hidden on mobile (bottom nav handles it) */}
        <nav
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          className="hidden sm:flex"
        >
          <Link
            href="/crm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              color: '#60a5fa',
              border: '1px solid #1e3a5f',
              borderRadius: '8px',
              padding: '7px 12px',
              textDecoration: 'none',
              transition: 'border-color 0.15s, color 0.15s',
              minHeight: 'unset',
            }}
          >
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Pipeline
            {replyCount > 0 && (
              <span style={{
                backgroundColor: '#fbbf24', color: '#000',
                borderRadius: '999px', padding: '0 5px',
                fontSize: '10px', fontWeight: 800, lineHeight: '16px',
                minWidth: '16px', textAlign: 'center',
              }}>
                {replyCount}
              </span>
            )}
          </Link>

          <a
            href="https://omar-portfolio.xyz"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              color: '#475569',
              border: '1px solid #0f1f35',
              borderRadius: '8px',
              padding: '7px 12px',
              textDecoration: 'none',
              transition: 'border-color 0.15s, color 0.15s',
              minHeight: 'unset',
            }}
          >
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Portfolio
          </a>

          <a
            href="https://www.upwork.com/freelancers/~01cb0d39a49a517f99"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              color: '#6fda44',
              border: '1px solid rgba(111,218,68,0.2)',
              borderRadius: '8px',
              padding: '7px 12px',
              textDecoration: 'none',
              transition: 'border-color 0.15s',
              minHeight: 'unset',
            }}
          >
            <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06 1.492 0 2.703 1.212 2.703 2.703-.001 1.489-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.22-1.834-2.148-4.036-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.546-1.405 0-2.543-1.14-2.543-2.546V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.229 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z" />
            </svg>
            Top Rated
          </a>
        </nav>
      </div>
    </header>
  );
}
