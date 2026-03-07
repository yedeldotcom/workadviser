import { describe, it, expect } from 'vitest';
import { scoreTemplate, scoreAndRank } from '../../src/core/engine/scorer';
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
    disclosureSuitability: ['functional'],
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

describe('Scorer', () => {
  it('produces a composite score between 0 and 1', () => {
    const result = scoreTemplate(makeTemplate(), profile, new Set());
    expect(result.compositeScore).toBeGreaterThan(0);
    expect(result.compositeScore).toBeLessThanOrEqual(1);
  });

  it('scores higher for matching barriers', () => {
    const matching = scoreTemplate(
      makeTemplate({ barrierTags: ['uncertainty'] }),
      profile,
      new Set()
    );
    const nonMatching = scoreTemplate(
      makeTemplate({ barrierTags: ['sensory_environment'] }),
      profile,
      new Set()
    );
    expect(matching.compositeScore).toBeGreaterThan(nonMatching.compositeScore);
  });

  it('penalizes same-family duplicates via diversity score', () => {
    const first = scoreTemplate(makeTemplate(), profile, new Set());
    const duplicate = scoreTemplate(makeTemplate(), profile, new Set(['fam-1']));
    expect(first.scores.diversityContribution).toBe(1.0);
    expect(duplicate.scores.diversityContribution).toBe(0.2);
  });

  it('ranks templates by composite score', () => {
    const templates = [
      makeTemplate({ id: 'tpl-a', stableRefId: 'A', barrierTags: ['sensory_environment'], familyId: 'fam-a' }),
      makeTemplate({ id: 'tpl-b', stableRefId: 'B', barrierTags: ['uncertainty'], familyId: 'fam-b' }),
    ];
    const ranked = scoreAndRank(templates, profile);
    expect(ranked[0].template.stableRefId).toBe('B');
  });
});
