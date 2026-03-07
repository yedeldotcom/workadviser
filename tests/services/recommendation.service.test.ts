import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationService } from '../../src/services/recommendation.service';
import { createMockPrisma, mockFn } from '../helpers/prisma-mock';
import { EmploymentStage, DisclosureLevel, ConfidenceLevel } from '../../src/core/types/enums';
import type { PrismaClient } from '@prisma/client';
import type { CaseProfileInput } from '../../src/core/engine/case-profiler';

// Mock the pipeline
vi.mock('../../src/core/engine/pipeline', () => ({
  runRecommendationPipeline: vi.fn().mockResolvedValue({
    candidateCount: 5,
    eligibleCount: 3,
    confidence: 'high',
    deduplication: { selected: ['t1', 't2'] },
    output: {
      userRecommendations: [
        { templateId: 't1', audience: 'user', contentHe: 'rec1', score: 0.9, tracePath: { step: 'test' } },
      ],
      employerRecommendations: [
        { templateId: 't2', audience: 'employer', contentHe: 'rec2', score: 0.7, tracePath: { step: 'test' } },
      ],
      orgRecommendations: [],
    },
  }),
}));

describe('RecommendationService', () => {
  let prisma: PrismaClient;
  let service: RecommendationService;

  const input: CaseProfileInput = {
    userId: 'user-1',
    employmentStage: EmploymentStage.ACTIVE_EMPLOYMENT,
    disclosureLevel: DisclosureLevel.FUNCTIONAL,
    barriers: [{ category: 'uncertainty', confidence: ConfidenceLevel.HIGH }],
    triggers: [],
    amplifiers: [],
    changeEvents: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    service = new RecommendationService(prisma);

    mockFn(prisma, 'renderedRecommendation', 'create').mockImplementation((args: { data: { templateId: string } }) =>
      Promise.resolve({ id: `rr-${args.data.templateId}`, ...args.data })
    );
    mockFn(prisma, 'recommendationTemplate', 'updateMany').mockResolvedValue({ count: 2 });
    mockFn(prisma, 'auditLog', 'create').mockResolvedValue({});
    // Mock findMany for candidate retriever
    mockFn(prisma, 'recommendationTemplate', 'findMany').mockResolvedValue([]);
  });

  describe('generateRecommendations', () => {
    it('runs pipeline and persists rendered recommendations', async () => {
      const result = await service.generateRecommendations(input);

      expect(result.candidateCount).toBe(5);
      expect(result.eligibleCount).toBe(3);
      expect(result.output.userRecommendations).toHaveLength(1);
      expect(result.output.employerRecommendations).toHaveLength(1);

      // Should persist 2 rendered recommendations (1 user + 1 employer)
      expect(mockFn(prisma, 'renderedRecommendation', 'create')).toHaveBeenCalledTimes(2);

      // Should increment inclusion counts
      expect(mockFn(prisma, 'recommendationTemplate', 'updateMany')).toHaveBeenCalledWith({
        where: { id: { in: ['t1', 't2'] } },
        data: { inclusionCount: { increment: 1 } },
      });
    });
  });

  describe('getRecommendationsForUser', () => {
    it('returns user recommendations with templates', async () => {
      const recs = [
        { id: 'rr-1', templateId: 't1', template: { family: { name: 'predictability' } } },
      ];
      mockFn(prisma, 'renderedRecommendation', 'findMany').mockResolvedValue(recs);

      const result = await service.getRecommendationsForUser('user-1');

      expect(result).toHaveLength(1);
      expect(mockFn(prisma, 'renderedRecommendation', 'findMany')).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { template: { include: { family: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
