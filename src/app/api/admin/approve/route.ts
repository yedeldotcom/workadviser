import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { ReportService } from '@/services/report.service';
import { DeliveryService } from '@/services/delivery.service';

const reportService = new ReportService(prisma);
const deliveryService = new DeliveryService(prisma);

// POST /api/admin/approve — approve a report
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { reportId?: string; reviewerId?: string; notes?: string };
    const { reportId, reviewerId, notes } = body;

    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }
    if (!reviewerId || typeof reviewerId !== 'string') {
      return NextResponse.json({ error: 'reviewerId is required' }, { status: 400 });
    }

    const updated = await reportService.approveReport(reportId, reviewerId, notes);

    // Auto-deliver to user after approval (non-blocking)
    deliveryService.onAdminApprove(reportId).catch((err) => {
      console.error('Auto-delivery error:', err);
    });

    return NextResponse.json({
      id: updated.id,
      releaseState: updated.releaseState,
      approvedAt: updated.approvedAt,
      reviewedBy: updated.reviewedBy,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Invalid transition') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
