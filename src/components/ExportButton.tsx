'use client';

import { useState } from 'react';
import type { Lead } from '@/types';
import { DownloadIcon, LoaderIcon } from './icons';

interface Props {
  leads: Lead[];
}

export default function ExportButton({ leads }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  if (leads.length === 0) return null;

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {loading ? (
        <>
          <LoaderIcon size={16} />
          Exporting...
        </>
      ) : (
        <>
          <DownloadIcon size={16} />
          Export CSV ({leads.length} leads)
        </>
      )}
    </button>
  );
}
