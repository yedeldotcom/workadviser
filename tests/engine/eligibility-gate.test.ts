import { describe, it, expect } from 'vitest';
import { checkEligibility } from '../../src/core/engine/eligibility-gate';
import { CaseProfile } from '../../src/core/engine/case-profiler';
import { EmploymentStage, DisclosureLevel, ConfidenceLevel } from '../../src/core/types/enums';

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tpl-1',
    familyId: 'fam-1',
    version: 1,
    stableRefId: 'REC-TEST-001',
    barrierTags: ['uncertainty'],
    employmentStageTags: ['active_employment'],
    workplaceTypeTags: [],
    actorTags: ['manager'],
    disclosureSuitability: ['functional', 'partial_contextual', 'full_voluntary'],
    confidenceLevel: 'medium',
    lifecycleState: 'active',
    timeHorizon: 'immediate',
    contentHe: 'test',
    contentEn: null,
    retrievalCount: 0,
    inclusionCount: 0,
    editCount: 0,
    approvalCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as never;
}

const profile: CaseProfile = {
  userId: 'user-1',
  employmentStage: EmploymentStage.ACTIVE_EMPLOYMENT,
  disclosureLevel: DisclosureLevel.FUNCTIONAL,
  barriers: [{ category: 'uncertainty', confidence: ConfidenceLevel.HIGH }],
  triggers: [],
  amplifiers: [],
  changeEvents: [],
  barrierCategories: ['uncertainty'],
  triggerCategories: [],
  hasActiveChangeEvent: false,
};

describe('Eligibility Gate', () => {
  it('passes a matching template', () => {
    const result = checkEligibility(makeTemplate(), profile);
    expect(result.eligible).toBe(true);
    expect(result.failedCriteria).toHaveLength(0);
  });

  it('fails on barrier mismatch', () => {
    const result = checkEligibility(
      makeTemplate({ barrierTags: ['sensory_environment'] }),
      profile
    );
    expect(result.eligible).toBe(false);
    expect(result.failedCriteria).toContain('barrier_fit');
  });

  it('fails on disclosure mismatch', () => {
    const result = checkEligibility(
      makeTemplate({ disclosureSuitability: ['full_voluntary'] }),
      { ...profile, disclosureLevel: DisclosureLevel.NONE }
    );
    expect(result.eligible).toBe(false);
    expect(result.failedCriteria).toContain('disclosure_fit');
  });

  it('fails on employment stage mismatch', () => {
    const result = checkEligibility(
      makeTemplate({ employmentStageTags: ['recruitment'] }),
      profile
    );
    expect(result.eligible).toBe(false);
    expect(result.failedCriteria).toContain('context_fit');
  });

  it('passes template with empty tags (universal)', () => {
    const result = checkEligibility(
      makeTemplate({
        barrierTags: [],
        employmentStageTags: [],
        disclosureSuitability: [],
      }),
      profile
    );
    expect(result.eligible).toBe(true);
  });
});
