'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      padding: '3rem',
      textAlign: 'center',
    }}>
      <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>Something went wrong</h2>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.6rem 1.5rem',
          background: '#1a1a2e',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
