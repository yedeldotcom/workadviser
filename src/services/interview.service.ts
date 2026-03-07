import { PrismaClient } from '@prisma/client';
import { InterviewSessionManager } from '../core/interview/session';
import { detectDistress, DistressSignal } from '../core/interview/distress';
import { detectSignals, DetectedSignal } from '../core/llm/parsers';
import { getQuestionsByStage, isInterviewComplete, InterviewQuestion } from '../core/interview/branching';
import { AuditLogger } from '../core/audit/logger';
import { MessageDirection, MessageType, ConfidenceLevel } from '../core/types/enums';

export class InterviewService {
  private sessionManager: InterviewSessionManager;
  private auditLogger: AuditLogger;

  constructor(private prisma: PrismaClient) {
    this.sessionManager = new InterviewSessionManager(prisma);
    this.auditLogger = new AuditLogger(prisma);
  }

  async startSession(userId: string) {
    const existing = await this.sessionManager.getActiveSession(userId);
    if (existing) return existing;

    const session = await this.sessionManager.createSession({ userId });

    await this.auditLogger.logStateTransition(
      'InterviewSession',
      session.id,
      'none',
      'onboarding',
      'system'
    );

    return session;
  }

  async processUserMessage(
    sessionId: string,
    content: string,
    type: MessageType = MessageType.TEXT
  ): Promise<{
    distress: DistressSignal;
    signals: DetectedSignal[];
    nextQuestions: InterviewQuestion[];
    response?: string;
    completed?: boolean;
  }> {
    // Store the message
    const message = await this.sessionManager.addMessage({
      sessionId,
      direction: MessageDirection.INBOUND,
      type,
      content,
    });

    // Check for distress
    const distress = detectDistress(content);

    if (distress.level === 'severe') {
      await this.sessionManager.transitionState(sessionId, 'distress_pause');
      await this.auditLogger.log({
        entityType: 'InterviewSession',
        entityId: sessionId,
        action: 'distress_detected',
        changeSummary: `Severe distress: ${distress.indicators.join(', ')}`,
      });

      return {
        distress,
        signals: [],
        nextQuestions: [],
        response: distress.action.type === 'stop_and_contain'
          ? distress.action.messageHe
          : undefined,
      };
    }

    // Detect signals (barrier/trigger/amplifier) — this calls Claude API
    let signals: DetectedSignal[] = [];
    try {
      signals = await detectSignals(content);
    } catch {
      // LLM unavailable — continue without signal detection
      signals = [];
    }

    // Get session userId once, outside the loop
    const sessionForSignals = await this.prisma.interviewSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: { userId: true },
    });

    // Store detected signals
    for (const signal of signals) {
      const normalizedSignal = await this.prisma.normalizedSignal.create({
        data: {
          messageId: message.id,
          signalType: signal.signalType === 'barrier' ? 'barrier_definition' :
                      signal.signalType === 'trigger' ? 'trigger' : 'workplace_amplifier' as never,
          rawValue: signal.rawEvidence,
          normalizedValue: signal.interpretation,
          confidence: signal.confidence,
        },
      });

      if (signal.signalType === 'barrier') {
        await this.prisma.barrier.create({
          data: {
            userId: sessionForSignals.userId,
            sessionId,
            signalId: normalizedSignal.id,
            category: signal.category,
            severity: signal.severity,
            confidence: signal.confidence >= 0.7 ? 'high' :
                       signal.confidence >= 0.4 ? 'medium' : 'low' as never,
          },
        });
      } else if (signal.signalType === 'trigger') {
        await this.prisma.trigger.create({
          data: {
            userId: sessionForSignals.userId,
            sessionId,
            signalId: normalizedSignal.id,
            category: signal.category,
            confidence: signal.confidence >= 0.7 ? 'high' :
                       signal.confidence >= 0.4 ? 'medium' : 'low' as never,
          },
        });
      } else if (signal.signalType === 'amplifier') {
        await this.prisma.workplaceAmplifier.create({
          data: {
            userId: sessionForSignals.userId,
            sessionId,
            signalId: normalizedSignal.id,
            category: signal.category,
            description: signal.interpretation,
            confidence: signal.confidence >= 0.7 ? 'high' :
                       signal.confidence >= 0.4 ? 'medium' : 'low' as never,
          },
        });
      }
    }

    // Determine current stage from answered questions
    const session = await this.prisma.interviewSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { messages: { where: { direction: 'inbound' }, select: { questionId: true } } },
    });
    const answeredIds = new Set(
      session.messages.map((m) => m.questionId).filter(Boolean)
    );

    // Check if interview is complete
    if (isInterviewComplete(answeredIds)) {
      await this.completeSession(sessionId);
      return {
        distress,
        signals,
        nextQuestions: [],
        completed: true,
        response: distress.action.type === 'offer_pause'
          ? distress.action.messageHe
          : undefined,
      };
    }

    const currentStage = this.inferStage(answeredIds);
    const nextQuestions = getQuestionsByStage(currentStage);

    return {
      distress,
      signals,
      nextQuestions,
      response: distress.action.type === 'offer_pause'
        ? distress.action.messageHe
        : undefined,
    };
  }

  private inferStage(answeredQuestionIds: Set<string | null>): number {
    const stageQuestionPrefixes = ['onb_', 'emp_', 'bar_', 'trg_', 'dis_', 'cls_'];
    for (let i = stageQuestionPrefixes.length - 1; i >= 0; i--) {
      const prefix = stageQuestionPrefixes[i];
      const hasAnswered = [...answeredQuestionIds].some((id) => id?.startsWith(prefix));
      if (hasAnswered) {
        return Math.min(i + 2, 6); // Move to next stage
      }
    }
    return 1; // Start at onboarding
  }

  async pauseSession(sessionId: string) {
    const session = await this.prisma.interviewSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    const result = await this.sessionManager.transitionState(sessionId, 'pause');
    await this.auditLogger.logStateTransition(
      'InterviewSession',
      sessionId,
      session.state,
      'paused',
      'user'
    );
    return result;
  }

  async resumeSession(sessionId: string) {
    const session = await this.prisma.interviewSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    const result = await this.sessionManager.transitionState(sessionId, 'resume');
    await this.auditLogger.logStateTransition(
      'InterviewSession',
      sessionId,
      session.state,
      'active',
      'user'
    );
    return result;
  }

  async completeSession(sessionId: string) {
    const session = await this.prisma.interviewSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    const result = await this.sessionManager.transitionState(sessionId, 'complete');
    await this.auditLogger.logStateTransition(
      'InterviewSession',
      sessionId,
      session.state,
      'completed',
      'system'
    );
    return result;
  }
}
