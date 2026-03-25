'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

type Ticket = { id: string; title: string; status: string; createdAt: string };

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = auth.getToken();
    if (!token) router.push('/login');
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/tickets');
        setTickets(res.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Tickets</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/tickets/new">+ New Ticket</Link>
          <button
            onClick={() => {
              auth.clear();
              router.push('/login');
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : tickets.length === 0 ? (
        <p>No tickets yet.</p>
      ) : (
        <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: 12,
                border: '1px solid #333',
                borderRadius: 12,
                textDecoration: 'none',
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{t.title}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{new Date(t.createdAt).toLocaleString()}</div>
              </div>
              <div>{t.status}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
