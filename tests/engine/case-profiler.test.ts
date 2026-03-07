import { describe, it, expect } from 'vitest';
import { buildCaseProfile, CaseProfileInput } from '../../src/core/engine/case-profiler';
import { EmploymentStage, WorkplaceType, DisclosureLevel, ConfidenceLevel } from '../../src/core/types/enums';

describe('Case Profiler', () => {
  const baseInput: CaseProfileInput = {
    userId: 'user-1',
    employmentStage: EmploymentStage.ACTIVE_EMPLOYMENT,
    workplaceType: WorkplaceType.PRIVATE_COMPANY,
    jobTitle: 'Software Developer',
    disclosureLevel: DisclosureLevel.FUNCTIONAL,
    barriers: [
      { category: 'uncertainty', confidence: ConfidenceLevel.HIGH },
      { category: 'overload', confidence: ConfidenceLevel.MEDIUM },
      { category: 'noise', confidence: ConfidenceLevel.LOW },
    ],
    triggers: [
      { category: 'sudden_change', confidence: ConfidenceLevel.HIGH },
    ],
    amplifiers: [
      { category: 'open_office', confidence: ConfidenceLevel.MEDIUM },
    ],
    changeEvents: [],
  };

  it('builds a case profile from input', () => {
    const profile = buildCaseProfile(baseInput);
    expect(profile.userId).toBe('user-1');
    expect(profile.employmentStage).toBe(EmploymentStage.ACTIVE_EMPLOYMENT);
    expect(profile.disclosureLevel).toBe(DisclosureLevel.FUNCTIONAL);
  });

  it('filters out low-confidence barriers', () => {
    const profile = buildCaseProfile(baseInput);
    expect(profile.barriers).toHaveLength(2);
    expect(profile.barrierCategories).toEqual(['uncertainty', 'overload']);
  });

  it('deduplicates barrier categories', () => {
    const input = {
      ...baseInput,
      barriers: [
        { category: 'uncertainty', confidence: ConfidenceLevel.HIGH },
        { category: 'uncertainty', confidence: ConfidenceLevel.MEDIUM },
      ],
    };
    const profile = buildCaseProfile(input);
    expect(profile.barrierCategories).toEqual(['uncertainty']);
  });

  it('defaults employment stage when not provided', () => {
    const input = { ...baseInput, employmentStage: undefined };
    const profile = buildCaseProfile(input);
    expect(profile.employmentStage).toBe(EmploymentStage.ACTIVE_EMPLOYMENT);
  });

  it('tracks change events', () => {
    const input = {
      ...baseInput,
      changeEvents: [{ eventType: 'new_boss', revalidationLevel: 'partial' }],
    };
    const profile = buildCaseProfile(input);
    expect(profile.hasActiveChangeEvent).toBe(true);
  });
});
