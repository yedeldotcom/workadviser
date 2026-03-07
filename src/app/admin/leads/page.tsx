import { prisma } from '@/db/client';
import { ExportButton } from './ExportButton';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const exportableLeads = await prisma.leadObject.findMany({
    where: { handoffState: 'lead_created' },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const allLeads = await prisma.leadObject.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: '#1a1a2e' }}>Lead Management</h1>

      {exportableLeads.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem', color: '#e74c3c' }}>
            Ready to Export ({exportableLeads.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {exportableLeads.map((lead) => (
              <div
                key={lead.id}
                style={{
                  padding: '1.5rem',
                  background: 'white',
                  borderRadius: 8,
                  border: '2px solid #fab1a0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {lead.orgName ?? 'Organization TBD'}
                    </div>
                    <div style={{ color: '#555', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                      Reason: {lead.reason}
                    </div>
                    {lead.lectureAngle && (
                      <div style={{ color: '#555', fontSize: '0.9rem' }}>
                        Lecture angle: {lead.lectureAngle}
                      </div>
                    )}
                    {lead.orgType && (
                      <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                        Org type: {lead.orgType}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.3rem 0.8rem',
                      background: '#fab1a0',
                      color: '#d63031',
                      borderRadius: 4,
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                    }}>
                      Ready
                    </span>
                    <ExportButton leadId={lead.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <h2 style={{ marginBottom: '1rem' }}>All Leads</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e9ecef', textAlign: 'right' }}>
            <th style={{ padding: '0.8rem' }}>Organization</th>
            <th style={{ padding: '0.8rem' }}>Reason</th>
            <th style={{ padding: '0.8rem' }}>State</th>
            <th style={{ padding: '0.8rem' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {allLeads.map((lead) => (
            <tr key={lead.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '0.8rem' }}>{lead.orgName ?? '—'}</td>
              <td style={{ padding: '0.8rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lead.reason}
              </td>
              <td style={{ padding: '0.8rem' }}>
                <span style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: 4,
                  fontSize: '0.8rem',
                  background: lead.handoffState === 'lead_created' ? '#fab1a0' :
                             lead.handoffState === 'exported' ? '#81ecec' : '#dfe6e9',
                  color: '#333',
                }}>
                  {lead.handoffState.replace(/_/g, ' ')}
                </span>
              </td>
              <td style={{ padding: '0.8rem', color: '#888' }}>
                {lead.createdAt.toLocaleDateString('he-IL')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
