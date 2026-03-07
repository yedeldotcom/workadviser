'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError('סיסמה שגויה');
        return;
      }

      const from = searchParams.get('from') ?? '/admin';
      router.push(from);
    } catch {
      setError('שגיאת חיבור');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f8f9fa',
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'white',
          padding: '2.5rem',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: 360,
        }}
      >
        <h1 style={{ marginBottom: '1.5rem', color: '#1a1a2e', textAlign: 'center' }}>
          Admin Login
        </h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          style={{
            width: '100%',
            padding: '0.8rem',
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: '1rem',
            marginBottom: '1rem',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{ color: '#e74c3c', margin: '0 0 1rem', fontSize: '0.9rem' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.8rem',
            background: loading ? '#95a5a6' : '#1a1a2e',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
