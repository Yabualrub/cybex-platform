'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@cybexs.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      auth.setToken(res.data.accessToken);
      router.push('/tickets');
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Support Login</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: '1px solid #333' }}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: '1px solid #333' }}
        />

        <button disabled={loading} style={{ padding: 10, borderRadius: 10 }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        {err && <div style={{ color: 'tomato' }}>{err}</div>}
      </form>
    </div>
  );
}
