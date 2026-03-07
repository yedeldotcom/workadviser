import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { InterviewService } from '@/services/interview.service';
import { MessageType } from '@/core/types/enums';

const interviewService = new InterviewService(prisma);

// POST /api/interview/[sessionId]/message — process a user message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = (await request.json()) as { content?: string; type?: string };
    const { content, type } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const messageType = type && Object.values(MessageType).includes(type as MessageType)
      ? (type as MessageType)
      : MessageType.TEXT;

    const result = await interviewService.processUserMessage(
      sessionId,
      content,
      messageType
    );

    return NextResponse.json({
      distress: {
        detected: result.distress.detected,
        level: result.distress.level,
      },
      signalCount: result.signals.length,
      signals: result.signals.map((s) => ({
        type: s.signalType,
        category: s.category,
        confidence: s.confidence,
      })),
      nextQuestions: result.nextQuestions,
      response: result.response,
    });
  } catch (error) {
    console.error('Failed to process message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
