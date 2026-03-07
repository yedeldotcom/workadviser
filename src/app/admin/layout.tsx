import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{
        width: 220,
        background: '#1a1a2e',
        color: 'white',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', padding: '0 0.5rem' }}>Admin Panel</h2>
        <NavLink href="/admin">Dashboard</NavLink>
        <NavLink href="/admin/reports">Reports Review</NavLink>
        <NavLink href="/admin/leads">Leads</NavLink>
      </nav>
      <main style={{ flex: 1, padding: '2rem', background: '#f8f9fa' }}>
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        color: '#ccc',
        textDecoration: 'none',
        padding: '0.5rem 0.8rem',
        borderRadius: 6,
        fontSize: '0.95rem',
      }}
    >
      {children}
    </Link>
  );
}
