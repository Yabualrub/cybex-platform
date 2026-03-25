'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';

type Msg = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string | null;
};

type Ticket = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  messages: Msg[];
};

export default function TicketDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    const res = await api.get(`/tickets/${id}`);
    setTicket(res.data);
  }

  useEffect(() => {
    // 🔐 حماية الصفحة
    if (!auth.getToken()) {
      router.push('/login');
      return;
    }

    // 📥 تحميل أولي
    load();

    // 🔄 تحديث تلقائي كل 5 ثواني
    const interval = setInterval(load, 5000);

    // 🧹 تنظيف عند الخروج
    return () => clearInterval(interval);
  }, [id, router]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post(`/tickets/${id}/messages`, { body: text });
      setText('');
      await load();
    } finally {
      setSending(false);
    }
  }

  if (!ticket) {
    return <div style={{ padding: 16 }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: 16 }}>
      {/* ⬅️ زر الرجوع */}
      <a href="/tickets" style={{ display: 'inline-block', marginBottom: 10 }}>
        ← Back
      </a>

      <h1 style={{ fontSize: 24, fontWeight: 700 }}>{ticket.title}</h1>
      <div style={{ opacity: 0.7, marginTop: 6 }}>{ticket.description}</div>

      {/* 💬 الرسائل */}
      <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            style={{
              border: '1px solid #333',
              borderRadius: 12,
              padding: 10,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {new Date(m.createdAt).toLocaleString()}
            </div>
            <div style={{ marginTop: 6 }}>{m.body}</div>
          </div>
        ))}
      </div>

      {/* ✍️ إرسال رسالة */}
      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message..."
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: '1px solid #333',
          }}
        />
        <button
          onClick={send}
          disabled={sending}
          style={{ padding: 10, borderRadius: 10 }}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
