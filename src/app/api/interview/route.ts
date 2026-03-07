import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { InterviewService } from '@/services/interview.service';

const interviewService = new InterviewService(prisma);

// POST /api/interview — create or resume a session
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId?: string };
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const session = await interviewService.startSession(userId);

    return NextResponse.json({
      sessionId: session.id,
      state: session.state,
      startedAt: session.startedAt,
    });
  } catch (error) {
    console.error('Failed to create interview session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
