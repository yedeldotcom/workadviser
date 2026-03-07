import { prisma } from '@/db/client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [
    userCount,
    sessionCount,
    reportCount,
    pendingReviews,
    leadCount,
    templateCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.interviewSession.count(),
    prisma.reportObject.count(),
    prisma.reportObject.count({ where: { releaseState: 'admin_review_required' } }),
    prisma.leadObject.count({ where: { handoffState: 'lead_created' } }),
    prisma.recommendationTemplate.count({ where: { lifecycleState: 'active' } }),
  ]);

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: '#1a1a2e' }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        <StatCard label="Users" value={userCount} />
        <StatCard label="Interview Sessions" value={sessionCount} />
        <StatCard label="Reports Generated" value={reportCount} />
        <StatCard label="Pending Reviews" value={pendingReviews} highlight={pendingReviews > 0} />
        <StatCard label="Exportable Leads" value={leadCount} highlight={leadCount > 0} />
        <StatCard label="Active Templates" value={templateCount} />
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{
      padding: '1.5rem',
      background: 'white',
      borderRadius: 8,
      border: highlight ? '2px solid #e74c3c' : '1px solid #e9ecef',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: highlight ? '#e74c3c' : '#1a1a2e' }}>
        {value}
      </div>
      <div style={{ color: '#888', marginTop: '0.3rem' }}>{label}</div>
    </div>
  );
}
