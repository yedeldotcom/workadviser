export default function AdminLoading() {
  return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <div style={{
        display: 'inline-block',
        width: 32,
        height: 32,
        border: '3px solid #e9ecef',
        borderTop: '3px solid #1a1a2e',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#888', marginTop: '1rem' }}>Loading...</p>
    </div>
  );
}
