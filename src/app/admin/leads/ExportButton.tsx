'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ExportButton({ leadId }: { leadId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleExport() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to export');
        return;
      }

      router.refresh();
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        onClick={handleExport}
        disabled={loading}
        style={{
          padding: '0.4rem 0.8rem',
          background: loading ? '#95a5a6' : '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '0.85rem',
        }}
      >
        {loading ? 'Exporting...' : 'Export'}
      </button>
      {error && <span style={{ color: '#e74c3c', fontSize: '0.8rem' }}>{error}</span>}
    </div>
  );
}
