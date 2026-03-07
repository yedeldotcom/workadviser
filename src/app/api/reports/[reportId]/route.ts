import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';

// GET /api/reports/[reportId] — get a single report
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;

    const report = await prisma.reportObject.findUnique({
      where: { id: reportId },
      include: {
        recommendations: {
          include: { recommendation: { include: { template: { include: { family: true } } } } },
          orderBy: { position: 'asc' },
        },
        approvals: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Failed to get report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
