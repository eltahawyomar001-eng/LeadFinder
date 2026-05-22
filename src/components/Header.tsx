'use client';

import { GermanyMapIcon } from './icons';

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-blue-400">
            <GermanyMapIcon size={34} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              LeadFinder<span className="text-blue-400">.de</span>
            </h1>
            <p className="text-xs text-slate-500 leading-none mt-0.5">
              by Omar Rageh · Full-Stack Developer &amp; Automation Builder
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://omar-portfolio.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded px-2.5 py-1.5 transition-colors"
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            omar-portfolio.xyz
          </a>
          <a
            href="https://www.upwork.com/freelancers/~01cb0d39a49a517f99"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-[#6fda44] hover:text-[#7ffb50] border border-[#6fda44]/30 hover:border-[#6fda44]/60 rounded px-2.5 py-1.5 transition-colors"
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06 1.492 0 2.703 1.212 2.703 2.703-.001 1.489-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.22-1.834-2.148-4.036-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.546-1.405 0-2.543-1.14-2.543-2.546V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.229 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z" />
            </svg>
            Top Rated on Upwork
          </a>
        </div>
      </div>
    </header>
  );
}
