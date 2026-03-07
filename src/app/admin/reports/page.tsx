import { prisma } from '@/db/client';
import { ApproveButton } from './ApproveButton';

export const dynamic = 'force-dynamic';

export default async function ReportsReviewPage() {
  const reports = await prisma.reportObject.findMany({
    where: { releaseState: 'admin_review_required' },
    include: { user: { select: { id: true, name: true, phone: true } } },
    orderBy: { generatedAt: 'asc' },
  });

  const recentReports = await prisma.reportObject.findMany({
    where: { releaseState: { not: 'admin_review_required' } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { generatedAt: 'desc' },
    take: 20,
  });

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: '#1a1a2e' }}>Report Review Queue</h1>

      {reports.length === 0 ? (
        <p style={{ color: '#888', padding: '2rem', textAlign: 'center', background: 'white', borderRadius: 8 }}>
          No reports pending review
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
          {reports.map((report) => (
            <div
              key={report.id}
              style={{
                padding: '1.5rem',
                background: 'white',
                borderRadius: 8,
                border: '1px solid #e9ecef',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>
                    {report.type.toUpperCase()} Report — {report.user.name ?? 'Anonymous'}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.9rem' }}>
                    Generated: {report.generatedAt.toLocaleDateString('he-IL')} | Version: {report.version}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <ApproveButton reportId={report.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginBottom: '1rem', color: '#1a1a2e' }}>Recent Reports</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e9ecef', textAlign: 'right' }}>
            <th style={{ padding: '0.8rem' }}>Type</th>
            <th style={{ padding: '0.8rem' }}>User</th>
            <th style={{ padding: '0.8rem' }}>State</th>
            <th style={{ padding: '0.8rem' }}>Generated</th>
          </tr>
        </thead>
        <tbody>
          {recentReports.map((report) => (
            <tr key={report.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '0.8rem' }}>{report.type}</td>
              <td style={{ padding: '0.8rem' }}>{report.user.name ?? 'Anonymous'}</td>
              <td style={{ padding: '0.8rem' }}>
                <StateBadge state={report.releaseState} />
              </td>
              <td style={{ padding: '0.8rem', color: '#888' }}>
                {report.generatedAt.toLocaleDateString('he-IL')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    draft_generated: { bg: '#ffeaa7', text: '#6c5ce7' },
    admin_review_required: { bg: '#fab1a0', text: '#d63031' },
    admin_edited_approved: { bg: '#81ecec', text: '#00b894' },
    delivered_to_user: { bg: '#a29bfe', text: '#6c5ce7' },
    user_viewed: { bg: '#74b9ff', text: '#0984e3' },
    sent_to_employer: { bg: '#55efc4', text: '#00b894' },
    withheld_cancelled: { bg: '#dfe6e9', text: '#636e72' },
    archived_replaced: { bg: '#dfe6e9', text: '#636e72' },
  };
  const style = colors[state] ?? { bg: '#f0f0f0', text: '#333' };

  return (
    <span style={{
      padding: '0.2rem 0.6rem',
      borderRadius: 4,
      fontSize: '0.8rem',
      background: style.bg,
      color: style.text,
    }}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}
