import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadService } from '../../src/services/lead.service';
import { createMockPrisma, mockFn } from '../helpers/prisma-mock';
import { buildCaseProfile, CaseProfileInput } from '../../src/core/engine/case-profiler';
import { EmploymentStage, DisclosureLevel, ConfidenceLevel } from '../../src/core/types/enums';
import type { PrismaClient } from '@prisma/client';

describe('LeadService', () => {
  let prisma: PrismaClient;
  let service: LeadService;

  const profileInput: CaseProfileInput = {
    userId: 'user-1',
    employmentStage: EmploymentStage.ACTIVE_EMPLOYMENT,
    disclosureLevel: DisclosureLevel.FULL_VOLUNTARY,
    barriers: [
      { category: 'communication', confidence: ConfidenceLevel.HIGH },
      { category: 'trust', confidence: ConfidenceLevel.HIGH },
      { category: 'performance_pressure', confidence: ConfidenceLevel.HIGH },
    ],
    triggers: [
      { category: 'sudden_change', confidence: ConfidenceLevel.HIGH },
      { category: 'deadline_pressure', confidence: ConfidenceLevel.HIGH },
    ],
    amplifiers: [
      { category: 'open_office', confidence: ConfidenceLevel.HIGH },
    ],
    changeEvents: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    service = new LeadService(prisma);
    mockFn(prisma, 'auditLog', 'create').mockResolvedValue({});
  });

  describe('evaluateAndCreateLead', () => {
    it('detects lecture opportunity from complex profile', async () => {
      mockFn(prisma, 'leadObject', 'create').mockResolvedValue({
        id: 'lead-1',
        handoffState: 'lead_created',
      });

      const profile = buildCaseProfile(profileInput);
      const result = await service.evaluateAndCreateLead(profile, {
        orgName: 'Test Corp',
      });

      expect(result.signal.detected).toBe(true);
    });

    it('does not create lead for simple profile', async () => {
      const simpleInput: CaseProfileInput = {
        userId: 'user-2',
        employmentStage: EmploymentStage.ACTIVE_EMPLOYMENT,
        disclosureLevel: DisclosureLevel.NONE,
        barriers: [{ category: 'uncertainty', confidence: ConfidenceLevel.MEDIUM }],
        triggers: [],
        amplifiers: [],
        changeEvents: [],
      };

      const profile = buildCaseProfile(simpleInput);
      const result = await service.evaluateAndCreateLead(profile);

      expect(result.signal.detected).toBe(false);
      expect(result.leadId).toBeUndefined();
    });
  });

  describe('getExportableLeads', () => {
    it('returns formatted exportable leads', async () => {
      mockFn(prisma, 'leadObject', 'findMany').mockResolvedValue([
        {
          id: 'lead-1',
          orgName: 'Corp A',
          contactPerson: null,
          contactChannel: null,
          orgType: 'private_company',
          lectureAngle: 'workplace accessibility',
          reason: 'Multiple barriers detected',
          consentStatus: 'granted',
          exportedAt: null,
          handoffState: 'lead_created',
        },
      ]);

      const leads = await service.getExportableLeads();

      expect(leads).toHaveLength(1);
      expect(leads[0].orgName).toBe('Corp A');
      expect(leads[0].leadId).toBe('lead-1');
    });
  });

  describe('exportLead', () => {
    it('transitions lead and logs export', async () => {
      mockFn(prisma, 'leadObject', 'findUniqueOrThrow').mockResolvedValue({
        id: 'lead-1',
        handoffState: 'lead_created',
      });
      mockFn(prisma, 'leadObject', 'update').mockResolvedValue({
        id: 'lead-1',
        handoffState: 'exported',
        exportedAt: new Date(),
      });

      const result = await service.exportLead('lead-1');

      expect(result.handoffState).toBe('exported');
      expect(mockFn(prisma, 'auditLog', 'create')).toHaveBeenCalled();
    });
  });
});
