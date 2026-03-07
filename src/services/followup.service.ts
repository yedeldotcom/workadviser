import { PrismaClient } from '@prisma/client';
import { InterviewSessionManager } from '../core/interview/session';
import { getFollowUpQuestions } from '../core/interview/followup-branching';
import { AuditLogger } from '../core/audit/logger';
import type { InterviewQuestion } from '../core/interview/branching';

export class FollowUpService {
  private sessionManager: InterviewSessionManager;
  private auditLogger: AuditLogger;

  constructor(private prisma: PrismaClient) {
    this.sessionManager = new InterviewSessionManager(prisma);
    this.auditLogger = new AuditLogger(prisma);
  }

  /**
   * Check if there are unaddressed change events that warrant a follow-up.
   */
  async checkForFollowUpTriggers(userId: string) {
    return this.prisma.changeEvent.findMany({
      where: {
        userId,
        revalidationLevel: { in: ['full_reassessment', 'partial'] },
      },
      orderBy: { detectedAt: 'desc' },
    });
  }

  /**
   * Initiate a follow-up session from a completed session.
   */
  async initiateFollowUp(
    userId: string,
    changeEventId?: string
  ): Promise<{ sessionId: string; questions: InterviewQuestion[] }> {
    // Find completed session
    const completedSession = await this.prisma.interviewSession.findFirst({
      where: { userId, state: 'completed' },
      orderBy: { completedAt: 'desc' },
    });

    if (!completedSession) {
      throw new Error('No completed session found for follow-up');
    }

    // Transition to follow_up
    await this.sessionManager.transitionState(completedSession.id, 'start_follow_up');

    // Get change event type if provided
    let changeType: string | undefined;
    if (changeEventId) {
      const changeEvent = await this.prisma.changeEvent.findUnique({
        where: { id: changeEventId },
      });
      changeType = changeEvent?.eventType;
    }

    const questions = getFollowUpQuestions(changeType);

    await this.auditLogger.logStateTransition(
      'InterviewSession',
      completedSession.id,
      'completed',
      'follow_up',
      'system'
    );

    return { sessionId: completedSession.id, questions };
  }
}
