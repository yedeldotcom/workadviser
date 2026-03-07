import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportService } from '../../src/services/report.service';
import { createMockPrisma, mockFn } from '../helpers/prisma-mock';
import { buildCaseProfile, CaseProfileInput } from '../../src/core/engine/case-profiler';
import { EmploymentStage, DisclosureLevel, ConfidenceLevel, Audience } from '../../src/core/types/enums';
import type { PackagedOutput } from '../../src/core/engine/packager';
import type { PrismaClient } from '@prisma/client';

describe('ReportService', () => {
  let prisma: PrismaClient;
  let service: ReportService;

  const profileInput: CaseProfileInput = {
    userId: 'user-1',
    employmentStage: EmploymentStage.ACTIVE_EMPLOYMENT,
    disclosureLevel: DisclosureLevel.FUNCTIONAL,
    barriers: [{ category: 'uncertainty', confidence: ConfidenceLevel.HIGH }],
    triggers: [{ category: 'sudden_change', confidence: ConfidenceLevel.HIGH }],
    amplifiers: [],
    changeEvents: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    service = new ReportService(prisma);

    // Default mock for report creation
    let reportCounter = 0;
    mockFn(prisma, 'reportObject', 'create').mockImplementation(() => {
      reportCounter++;
      return Promise.resolve({
        id: `report-${reportCounter}`,
        releaseState: 'draft_generated',
        generatedAt: new Date(),
      });
    });
    mockFn(prisma, 'auditLog', 'create').mockResolvedValue({});
  });

  describe('generateReports', () => {
    it('generates user, employer, and org reports', async () => {
      const profile = buildCaseProfile(profileInput);
      const mockTrace = {
        templateRefId: 'REC-PRED-001',
        barrierTags: ['uncertainty'],
        matchedBarriers: ['uncertainty'],
        employmentStage: 'active_employment',
        disclosureLevel: 'functional',
        score: 0.8,
        scoreDimensions: {},
      };
      const output: PackagedOutput = {
        userRecommendations: [
          { templateId: 't1', stableRefId: 'REC-PRED-001', familyId: 'f1', audience: Audience.USER, actorTags: ['user_self'], timeHorizon: 'immediate', contentHe: 'המלצה למשתמש', score: 0.8, tracePath: mockTrace },
        ],
        employerRecommendations: [
          { templateId: 't2', stableRefId: 'REC-COMM-001', familyId: 'f2', audience: Audience.EMPLOYER, actorTags: ['manager'], timeHorizon: 'immediate', contentHe: 'המלצה למעסיק', score: 0.7, tracePath: mockTrace },
        ],
        orgRecommendations: [],
      };

      const result = await service.generateReports(profile, output);

      expect(result.userReport).toBeDefined();
      expect(result.employerReport).toBeDefined();
      expect(result.orgSignal).toBeDefined();
      expect(result.reportIds.user).toBeDefined();
      expect(result.reportIds.org).toBeDefined();
      // Report objects created (user + employer + org = 3)
      expect(mockFn(prisma, 'reportObject', 'create')).toHaveBeenCalledTimes(3);
    });

    it('generates reports without employer report when disclosure is none', async () => {
      const noneDisclosureInput = {
        ...profileInput,
        disclosureLevel: DisclosureLevel.NONE,
      };
      const profile = buildCaseProfile(noneDisclosureInput);
      const output = {
        userRecommendations: [],
        employerRecommendations: [],
        orgRecommendations: [],
      };

      const result = await service.generateReports(profile, output);

      expect(result.userReport).toBeDefined();
      expect(result.orgSignal).toBeDefined();
    });
  });

  describe('transitionReport', () => {
    it('transitions report from draft to review required', async () => {
      mockFn(prisma, 'reportObject', 'findUniqueOrThrow').mockResolvedValue({
        id: 'report-1',
        releaseState: 'draft_generated',
      });
      mockFn(prisma, 'reportObject', 'update').mockResolvedValue({
        id: 'report-1',
        releaseState: 'admin_review_required',
      });

      const result = await service.transitionReport('report-1', 'submit_for_review');

      expect(result.releaseState).toBe('admin_review_required');
    });

    it('throws on invalid transition', async () => {
      mockFn(prisma, 'reportObject', 'findUniqueOrThrow').mockResolvedValue({
        id: 'report-1',
        releaseState: 'draft_generated',
      });

      await expect(
        service.transitionReport('report-1', 'deliver_to_user')
      ).rejects.toThrow();
    });
  });

  describe('approveReport', () => {
    it('creates approval record and transitions state', async () => {
      mockFn(prisma, 'approvalObject', 'create').mockResolvedValue({});
      mockFn(prisma, 'reportObject', 'findUniqueOrThrow').mockResolvedValue({
        id: 'report-1',
        releaseState: 'admin_review_required',
      });
      mockFn(prisma, 'reportObject', 'update').mockResolvedValue({
        id: 'report-1',
        releaseState: 'admin_edited_approved',
        approvedAt: new Date(),
        reviewedBy: 'reviewer-1',
      });

      const result = await service.approveReport('report-1', 'reviewer-1', 'Looks good');

      expect(mockFn(prisma, 'approvalObject', 'create')).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportId: 'report-1',
          reviewerId: 'reviewer-1',
          notes: 'Looks good',
        }),
      });
      expect(result.releaseState).toBe('admin_edited_approved');
    });
  });

  describe('getUserReports', () => {
    it('returns reports for a user', async () => {
      const reports = [
        { id: 'r1', type: 'user', releaseState: 'delivered_to_user' },
        { id: 'r2', type: 'employer', releaseState: 'draft_generated' },
      ];
      mockFn(prisma, 'reportObject', 'findMany').mockResolvedValue(reports);

      const result = await service.getUserReports('user-1');

      expect(result).toHaveLength(2);
      expect(mockFn(prisma, 'reportObject', 'findMany')).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { generatedAt: 'desc' },
      });
    });
  });

  describe('getReportsForReview', () => {
    it('returns reports pending review', async () => {
      const reports = [{ id: 'r1', releaseState: 'admin_review_required', user: { name: 'Test' } }];
      mockFn(prisma, 'reportObject', 'findMany').mockResolvedValue(reports);

      const result = await service.getReportsForReview();

      expect(result).toHaveLength(1);
    });
  });
});
