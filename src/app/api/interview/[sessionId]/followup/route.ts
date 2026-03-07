import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { FollowUpService } from '@/services/followup.service';

const followUpService = new FollowUpService(prisma);

// POST /api/interview/[sessionId]/followup — initiate a follow-up session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = (await request.json()) as { changeEventId?: string };

    // Get session to find userId
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, state: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.state !== 'completed') {
      return NextResponse.json(
        { error: 'Follow-up can only be initiated from a completed session' },
        { status: 409 }
      );
    }

    const result = await followUpService.initiateFollowUp(
      session.userId,
      body.changeEventId
    );

    return NextResponse.json({
      sessionId: result.sessionId,
      questions: result.questions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
