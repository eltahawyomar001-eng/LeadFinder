'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return 'just now';
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/templates');
    const { templates: t } = await res.json();
    setTemplates(t ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ name: '', subject: '', body: '' });
    setEditingId('new');
  };

  const openEdit = (t: EmailTemplate) => {
    setForm({ name: t.name, subject: t.subject, body: t.body });
    setEditingId(t.id);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editingId === 'new') {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { await load(); setEditingId(null); }
    } else {
      await fetch('/api/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...form }),
      });
      await load();
      setEditingId(null);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    setDeleting(id);
    await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
    await load();
    setDeleting(null);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#020609', color: '#e2e8f0' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #0a1628',
        backgroundColor: 'rgba(2,6,9,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/crm" style={{ color: '#475569', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            CRM
          </Link>
          <span style={{ color: '#1e293b', fontSize: '16px' }}>|</span>
          <h1 style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: 800 }}>Email Templates</h1>
          <div style={{ flex: 1 }} />
          <button
            onClick={openNew}
            style={{
              backgroundColor: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd',
              borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', minHeight: 'unset',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Template
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Editor modal */}
        {editingId && (
          <div
            onClick={() => setEditingId(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#040d1a', border: '1px solid #1e293b',
                borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px',
                display: 'flex', flexDirection: 'column', gap: '16px',
                animation: 'fadeInUp 0.2s ease-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: 800 }}>
                  {editingId === 'new' ? 'New Template' : 'Edit Template'}
                </h2>
                <button
                  onClick={() => setEditingId(null)}
                  style={{ background: 'none', border: '1px solid #1e293b', color: '#475569', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 'unset' }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div>
                <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Template Name</p>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. German Follow-up #2"
                  style={{
                    width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b',
                    borderRadius: '8px', padding: '10px 12px', color: '#f1f5f9',
                    fontSize: '13px', boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              <div>
                <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Subject</p>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Email subject line…"
                  style={{
                    width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b',
                    borderRadius: '8px', padding: '10px 12px', color: '#f1f5f9',
                    fontSize: '13px', boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                  <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Body</p>
                  <span style={{ color: '#334155', fontSize: '10px' }}>{form.body.length} chars</span>
                </div>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Email body…"
                  rows={10}
                  style={{
                    width: '100%', backgroundColor: '#0a1628', border: '1px solid #1e293b',
                    borderRadius: '8px', padding: '10px 12px', color: '#e2e8f0',
                    fontSize: '13px', resize: 'vertical', lineHeight: 1.6,
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                style={{
                  backgroundColor: saving || !form.name.trim() ? '#0a1628' : '#1e3a5f',
                  border: `1px solid ${saving || !form.name.trim() ? '#1e293b' : '#3b82f6'}`,
                  color: saving || !form.name.trim() ? '#334155' : '#93c5fd',
                  borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700,
                  cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer',
                  minHeight: 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
                {saving ? 'Saving…' : 'Save Template'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
        ) : templates.length === 0 ? (
          <div style={{
            backgroundColor: '#06101f', border: '1px solid #0f1f36',
            borderRadius: '14px', padding: '48px 24px', textAlign: 'center',
          }}>
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <p style={{ color: '#475569', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>No templates yet</p>
            <p style={{ color: '#334155', fontSize: '13px', marginBottom: '20px' }}>Create reusable email templates you can load in the CRM message composer.</p>
            <button
              onClick={openNew}
              style={{
                backgroundColor: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd',
                borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', minHeight: 'unset',
              }}
            >
              Create first template
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {templates.map((t) => (
              <div
                key={t.id}
                style={{
                  backgroundColor: '#06101f', border: '1px solid #0f1f36',
                  borderRadius: '14px', overflow: 'hidden',
                }}
              >
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <p style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 800 }}>{t.name}</p>
                      <span style={{ color: '#334155', fontSize: '11px' }}>{timeAgo(t.created_at)}</span>
                    </div>
                    {t.subject && (
                      <p style={{ color: '#60a5fa', fontSize: '12px', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.subject}
                      </p>
                    )}
                    <p style={{ color: '#334155', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.body.slice(0, 100)}{t.body.length > 100 ? '…' : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(t)}
                      style={{
                        background: 'none', border: '1px solid #1e293b', color: '#475569',
                        borderRadius: '7px', padding: '6px 12px', fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', minHeight: 'unset',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                      style={{
                        background: 'none', border: '1px solid #7f1d1d', color: '#f87171',
                        borderRadius: '7px', padding: '6px 10px', fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', minHeight: 'unset', opacity: deleting === t.id ? 0.6 : 1,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
