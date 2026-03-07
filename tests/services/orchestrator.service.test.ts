import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrchestratorService } from '../../src/services/orchestrator.service';
import { createMockPrisma, mockFn } from '../helpers/prisma-mock';
import type { PrismaClient } from '@prisma/client';

// Mock the recommendation pipeline
vi.mock('../../src/core/engine/pipeline', () => ({
  runRecommendationPipeline: vi.fn().mockResolvedValue({
    profile: { userId: 'user-1', barriers: [], triggers: [], amplifiers: [], barrierCategories: [], triggerCategories: [] },
    output: {
      userRecommendations: [],
      employerRecommendations: [],
      orgRecommendations: [],
    },
    candidateCount: 0,
    eligibleCount: 0,
    deduplication: { selected: [], removed: [] },
    confidence: { overall: 0.5, dimensions: {} },
  }),
}));

describe('OrchestratorService', () => {
  let prisma: PrismaClient;
  let service: OrchestratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    service = new OrchestratorService(prisma);

    mockFn(prisma, 'auditLog', 'create').mockResolvedValue({});
  });

  describe('onInterviewComplete', () => {
    it('runs full pipeline and generates reports', async () => {
      // Mock session with user
      mockFn(prisma, 'interviewSession', 'findUniqueOrThrow').mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        user: {
          id: 'user-1',
          profile: {
            employmentStage: 'active_employment',
            disclosureLevel: 'none',
          },
        },
      });

      // Mock signals
      mockFn(prisma, 'barrier', 'findMany').mockResolvedValue([]);
      mockFn(prisma, 'trigger', 'findMany').mockResolvedValue([]);
      mockFn(prisma, 'workplaceAmplifier', 'findMany').mockResolvedValue([]);
      mockFn(prisma, 'changeEvent', 'findMany').mockResolvedValue([]);

      // Mock report generation
      let counter = 0;
      mockFn(prisma, 'reportObject', 'create').mockImplementation(() => {
        counter++;
        return Promise.resolve({
          id: `report-${counter}`,
          releaseState: 'draft_generated',
        });
      });

      // Mock report transition
      mockFn(prisma, 'reportObject', 'findUniqueOrThrow').mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve({ id: where.id, releaseState: 'draft_generated' })
      );
      mockFn(prisma, 'reportObject', 'update').mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) =>
        Promise.resolve({ id: where.id, ...data })
      );

      const result = await service.onInterviewComplete('session-1');

      expect(result.reportIds.user).toBeDefined();
      expect(result.reportIds.org).toBeDefined();
      // Reports created
      expect(mockFn(prisma, 'reportObject', 'create')).toHaveBeenCalled();
      // Reports submitted for review
      expect(mockFn(prisma, 'reportObject', 'update')).toHaveBeenCalled();
    });
  });
});
