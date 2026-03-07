'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ApproveButton({ reportId }: { reportId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();

  async function handleApprove() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, reviewerId: 'admin' }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to approve');
        return;
      }

      router.refresh();
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
      setConfirmed(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
      <button
        onClick={handleApprove}
        disabled={loading}
        style={{
          padding: '0.5rem 1rem',
          background: confirmed ? '#e74c3c' : loading ? '#95a5a6' : '#27ae60',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '0.9rem',
        }}
      >
        {loading ? 'Approving...' : confirmed ? 'Confirm Approve' : 'Approve'}
      </button>
      {confirmed && !loading && (
        <button
          onClick={() => setConfirmed(false)}
          style={{
            padding: '0.3rem 0.6rem',
            background: 'transparent',
            color: '#888',
            border: '1px solid #ddd',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          Cancel
        </button>
      )}
      {error && <span style={{ color: '#e74c3c', fontSize: '0.8rem' }}>{error}</span>}
    </div>
  );
}
