import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterviewService } from '../../src/services/interview.service';
import { createMockPrisma, mockFn } from '../helpers/prisma-mock';
import { MessageType } from '../../src/core/types/enums';
import type { PrismaClient } from '@prisma/client';

// Mock LLM signal detection
vi.mock('../../src/core/llm/parsers', () => ({
  detectSignals: vi.fn().mockResolvedValue([]),
}));

describe('InterviewService', () => {
  let prisma: PrismaClient;
  let service: InterviewService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    service = new InterviewService(prisma);
  });

  describe('startSession', () => {
    it('returns existing active session if one exists', async () => {
      const existingSession = { id: 'session-1', userId: 'user-1', state: 'active' };
      mockFn(prisma, 'interviewSession', 'findFirst').mockResolvedValue(existingSession);

      const result = await service.startSession('user-1');

      expect(result).toBe(existingSession);
      expect(mockFn(prisma, 'interviewSession', 'create')).not.toHaveBeenCalled();
    });

    it('creates new session if none exists', async () => {
      const newSession = { id: 'session-2', userId: 'user-1', state: 'onboarding' };
      mockFn(prisma, 'interviewSession', 'findFirst').mockResolvedValue(null);
      mockFn(prisma, 'interviewSession', 'create').mockResolvedValue(newSession);
      mockFn(prisma, 'auditLog', 'create').mockResolvedValue({});

      const result = await service.startSession('user-1');

      expect(result.id).toBe('session-2');
      expect(result.state).toBe('onboarding');
    });
  });

  describe('processUserMessage', () => {
    it('stores inbound message and returns next questions', async () => {
      const message = { id: 'msg-1', sessionId: 'session-1' };
      mockFn(prisma, 'message', 'create').mockResolvedValue(message);
      mockFn(prisma, 'interviewSession', 'findUniqueOrThrow').mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        state: 'active',
        messages: [],
      });

      const result = await service.processUserMessage(
        'session-1',
        'אני עובד בהייטק',
        MessageType.TEXT
      );

      expect(result.distress.detected).toBe(false);
      expect(result.nextQuestions).toBeDefined();
      expect(result.nextQuestions.length).toBeGreaterThan(0);
      expect(mockFn(prisma, 'message', 'create')).toHaveBeenCalled();
    });

    it('detects severe distress and pauses session', async () => {
      const message = { id: 'msg-2', sessionId: 'session-1' };
      mockFn(prisma, 'message', 'create').mockResolvedValue(message);
      mockFn(prisma, 'interviewSession', 'findUniqueOrThrow').mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        state: 'active',
      });
      mockFn(prisma, 'interviewSession', 'update').mockResolvedValue({
        id: 'session-1',
        state: 'paused',
      });
      mockFn(prisma, 'auditLog', 'create').mockResolvedValue({});

      const result = await service.processUserMessage(
        'session-1',
        'לא רוצה לחיות',
        MessageType.TEXT
      );

      expect(result.distress.detected).toBe(true);
      expect(result.distress.level).toBe('severe');
      expect(result.signals).toEqual([]);
      expect(result.nextQuestions).toEqual([]);
      expect(result.response).toBeDefined();
    });

    it('detects moderate distress and offers pause', async () => {
      const message = { id: 'msg-3', sessionId: 'session-1' };
      mockFn(prisma, 'message', 'create').mockResolvedValue(message);
      mockFn(prisma, 'interviewSession', 'findUniqueOrThrow').mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        state: 'active',
        messages: [],
      });

      const result = await service.processUserMessage(
        'session-1',
        'אני לא יכול, קשה לי מדי',
        MessageType.TEXT
      );

      expect(result.distress.detected).toBe(true);
      expect(result.distress.level).toBe('moderate');
      expect(result.response).toBeDefined();
    });
  });

  describe('pauseSession', () => {
    it('transitions session to paused state', async () => {
      const session = { id: 'session-1', state: 'active' };
      const pausedSession = { id: 'session-1', state: 'paused', pausedAt: new Date() };
      mockFn(prisma, 'interviewSession', 'findUniqueOrThrow').mockResolvedValue(session);
      mockFn(prisma, 'interviewSession', 'update').mockResolvedValue(pausedSession);
      mockFn(prisma, 'auditLog', 'create').mockResolvedValue({});

      const result = await service.pauseSession('session-1');

      expect(result.state).toBe('paused');
    });
  });

  describe('resumeSession', () => {
    it('transitions session from paused to active', async () => {
      const session = { id: 'session-1', state: 'paused' };
      const activeSession = { id: 'session-1', state: 'active' };
      mockFn(prisma, 'interviewSession', 'findUniqueOrThrow').mockResolvedValue(session);
      mockFn(prisma, 'interviewSession', 'update').mockResolvedValue(activeSession);
      mockFn(prisma, 'auditLog', 'create').mockResolvedValue({});

      const result = await service.resumeSession('session-1');

      expect(result.state).toBe('active');
    });
  });

  describe('completeSession', () => {
    it('transitions session to completed', async () => {
      const session = { id: 'session-1', state: 'active' };
      const completedSession = { id: 'session-1', state: 'completed', completedAt: new Date() };
      mockFn(prisma, 'interviewSession', 'findUniqueOrThrow').mockResolvedValue(session);
      mockFn(prisma, 'interviewSession', 'update').mockResolvedValue(completedSession);
      mockFn(prisma, 'auditLog', 'create').mockResolvedValue({});

      const result = await service.completeSession('session-1');

      expect(result.state).toBe('completed');
    });
  });
});
