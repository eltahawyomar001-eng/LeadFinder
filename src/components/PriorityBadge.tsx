'use client';

import { getPriority } from '@/lib/scoring';
import type { Priority } from '@/types';

const CONFIG: Record<Priority, { label: string; bar: string; text: string; bg: string; border: string }> = {
  high: {
    label: 'High Priority',
    bar: 'bg-red-500',
    text: 'text-red-400',
    bg: 'bg-red-950/60',
    border: 'border-red-800',
  },
  medium: {
    label: 'Medium',
    bar: 'bg-amber-500',
    text: 'text-amber-400',
    bg: 'bg-amber-950/60',
    border: 'border-amber-800',
  },
  low: {
    label: 'Low',
    bar: 'bg-sky-500',
    text: 'text-sky-400',
    bg: 'bg-sky-950/60',
    border: 'border-sky-800',
  },
};

export default function PriorityBadge({ score }: { score: number }) {
  const priority = getPriority(score);
  const cfg = CONFIG[priority];

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${cfg.bg} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.bar}`} />
      <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
}
