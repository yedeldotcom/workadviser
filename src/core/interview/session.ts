import { PrismaClient } from '@prisma/client';
import { interviewStateMachine, InterviewStateValue, InterviewEvent } from '../state-machines/interview';
import { MessageDirection, MessageType } from '../types/enums';

export interface CreateSessionInput {
  userId: string;
}

export interface AddMessageInput {
  sessionId: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  questionId?: string;
}

export class InterviewSessionManager {
  constructor(private prisma: PrismaClient) {}

  async createSession(input: CreateSessionInput) {
    return this.prisma.interviewSession.create({
      data: {
        userId: input.userId,
        state: 'onboarding',
      },
    });
  }

  async transitionState(sessionId: string, event: InterviewEvent) {
    const session = await this.prisma.interviewSession.findUniqueOrThrow({
      where: { id: sessionId },
    });

    const currentState = session.state as InterviewStateValue;
    const nextState = interviewStateMachine.transition(currentState, event);

    const updateData: Record<string, unknown> = { state: nextState };

    if (nextState === 'paused') {
      updateData.pausedAt = new Date();
    }
    if (nextState === 'completed') {
      updateData.completedAt = new Date();
    }
    if (event === 'resume') {
      updateData.pausedAt = null;
    }

    return this.prisma.interviewSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  async addMessage(input: AddMessageInput) {
    return this.prisma.message.create({
      data: {
        sessionId: input.sessionId,
        direction: input.direction as never,
        type: input.type as never,
        content: input.content,
        questionId: input.questionId,
      },
    });
  }

  async getSession(sessionId: string) {
    return this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        barriers: true,
        triggers: true,
        workplaceAmplifiers: true,
      },
    });
  }

  async getActiveSession(userId: string) {
    return this.prisma.interviewSession.findFirst({
      where: {
        userId,
        state: { in: ['onboarding', 'active', 'paused'] },
      },
      orderBy: { startedAt: 'desc' },
    });
  }
}
