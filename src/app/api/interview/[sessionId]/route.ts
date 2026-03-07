import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { InterviewSessionManager } from '@/core/interview/session';
import { InterviewService } from '@/services/interview.service';

const sessionManager = new InterviewSessionManager(prisma);
const interviewService = new InterviewService(prisma);

// GET /api/interview/[sessionId] — get session with messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Failed to get session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/interview/[sessionId] — pause/resume/complete session
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = (await request.json()) as { action?: string };
    const { action } = body;

    if (!action || !['pause', 'resume', 'complete'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be one of: pause, resume, complete' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'pause':
        result = await interviewService.pauseSession(sessionId);
        break;
      case 'resume':
        result = await interviewService.resumeSession(sessionId);
        break;
      case 'complete':
        result = await interviewService.completeSession(sessionId);
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Invalid transition') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
