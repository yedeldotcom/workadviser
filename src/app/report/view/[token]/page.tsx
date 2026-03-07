import { prisma } from '@/db/client';
import { validateSecureReportLink } from '@/core/reports/secure-link';
import { ReportService } from '@/services/report.service';
import type { EmployerReport } from '@/core/reports/employer-report';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ReportViewPage({ params }: PageProps) {
  const { token } = await params;
  const validation = validateSecureReportLink(token);

  if (!validation.valid || !validation.reportId) {
    return (
      <div dir="rtl" style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h1>הקישור אינו תקף</h1>
        <p>ייתכן שהקישור פג תוקף או שהוא שגוי. אנא פנה/י לקבלת קישור חדש.</p>
      </div>
    );
  }

  const report = await prisma.reportObject.findUnique({
    where: { id: validation.reportId },
  });

  if (!report) {
    return (
      <div dir="rtl" style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h1>הדוח לא נמצא</h1>
      </div>
    );
  }

  // Mark as employer_viewed if in sent_to_employer state
  if (report.releaseState === 'sent_to_employer') {
    const reportService = new ReportService(prisma);
    await reportService.transitionReport(report.id, 'employer_view', 'employer');
  }

  const content = report.contentJson as unknown as EmployerReport;

  return (
    <div dir="rtl" style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ borderBottom: '2px solid #2563eb', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ color: '#1e3a5f', margin: 0 }}>דוח נגישות תעסוקתית — למעסיק</h1>
        <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
          {content.generatedAt ? new Date(content.generatedAt).toLocaleDateString('he-IL') : ''}
        </p>
      </header>

      {content.sections?.map((section) => (
        <section key={section.id} style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#1e3a5f', borderRight: '4px solid #2563eb', paddingRight: '0.75rem' }}>
            {section.titleHe}
          </h2>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: '#374151' }}>
            {section.contentHe}
          </div>
        </section>
      ))}

      <footer style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '2rem', color: '#9ca3af', fontSize: '0.875rem' }}>
        <p>מסמך זה הופק באופן אוטומטי כחלק מתהליך נגישות תעסוקתית. המידע מיועד לשימוש ניהולי בלבד.</p>
      </footer>
    </div>
  );
}
