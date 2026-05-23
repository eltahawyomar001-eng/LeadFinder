'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const TABS = [
  {
    href: '/',
    label: 'Find Leads',
    icon: (active: boolean) => (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="8" y1="11" x2="14" y2="11" strokeWidth={active ? 1.8 : 1.5} strokeOpacity="0.6" />
        <line x1="11" y1="8" x2="11" y2="14" strokeWidth={active ? 1.8 : 1.5} strokeOpacity="0.6" />
      </svg>
    ),
  },
  {
    href: '/crm',
    label: 'Pipeline',
    icon: (active: boolean) => (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'rgba(2, 6, 9, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid #0f1f35',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        display: 'flex',
      }}
      className="sm:hidden"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '10px 0 8px',
              color: active ? '#3b82f6' : '#334155',
              textDecoration: 'none',
              transition: 'color 0.15s',
              minHeight: '56px',
              position: 'relative',
            }}
          >
            {active && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '20%',
                  right: '20%',
                  height: '2px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '0 0 2px 2px',
                }}
              />
            )}
            {tab.icon(active)}
            <span
              style={{
                fontSize: '10px',
                fontWeight: active ? 700 : 500,
                letterSpacing: '0.02em',
                color: active ? '#3b82f6' : '#334155',
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
