import { NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { ReportService } from '@/services/report.service';

const reportService = new ReportService(prisma);

// GET /api/admin/reports — list reports pending review
export async function GET() {
  try {
    const reports = await reportService.getReportsForReview();

    return NextResponse.json({
      count: reports.length,
      reports: reports.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.name,
        type: r.type,
        releaseState: r.releaseState,
        generatedAt: r.generatedAt,
        version: r.version,
      })),
    });
  } catch (error) {
    console.error('Failed to get reports for review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
