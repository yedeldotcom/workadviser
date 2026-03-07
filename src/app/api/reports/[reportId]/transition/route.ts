import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { ReportService } from '@/services/report.service';
import { ReleaseEvent } from '@/core/state-machines/output-release';

const reportService = new ReportService(prisma);

const VALID_EVENTS: ReleaseEvent[] = [
  'submit_for_review', 'approve', 'mark_ready_for_user', 'deliver_to_user',
  'user_view', 'user_request_correction', 'correction_complete',
  'user_approve_employer_sharing', 'mark_ready_for_employer', 'send_to_employer',
  'employer_view', 'withhold', 'cancel', 'archive', 'replace',
];

// POST /api/reports/[reportId]/transition — transition report release state
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    const body = (await request.json()) as { event?: string; changedBy?: string };
    const { event, changedBy } = body;

    if (!event || !VALID_EVENTS.includes(event as ReleaseEvent)) {
      return NextResponse.json(
        { error: `event must be one of: ${VALID_EVENTS.join(', ')}` },
        { status: 400 }
      );
    }

    const updated = await reportService.transitionReport(
      reportId,
      event as ReleaseEvent,
      changedBy
    );

    return NextResponse.json({
      id: updated.id,
      releaseState: updated.releaseState,
      approvedAt: updated.approvedAt,
      deliveredAt: updated.deliveredAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Invalid transition') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
