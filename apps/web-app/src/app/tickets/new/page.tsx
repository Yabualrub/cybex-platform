'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await api.post('/tickets', { title, description });
      router.push(`/tickets/${res.data.id}`);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>New Ticket</h1>

      <form onSubmit={submit} style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: '1px solid #333' }}
        />
        <textarea
          placeholder="Describe the issue..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          style={{ padding: 10, borderRadius: 10, border: '1px solid #333' }}
        />
        <button disabled={loading} style={{ padding: 10, borderRadius: 10 }}>
          {loading ? 'Creating...' : 'Create'}
        </button>
        {err && <div style={{ color: 'tomato' }}>{err}</div>}
      </form>
    </div>
  );
}
