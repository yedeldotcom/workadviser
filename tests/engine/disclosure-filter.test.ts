import { describe, it, expect } from 'vitest';
import { applyDisclosureFilter, filterBarrierDescriptions } from '../../src/core/reports/disclosure-filter';
import { CaseProfile } from '../../src/core/engine/case-profiler';
import { PackagedRecommendation } from '../../src/core/engine/packager';
import { EmploymentStage, DisclosureLevel, ConfidenceLevel, Audience } from '../../src/core/types/enums';

const makeProfile = (disclosure: DisclosureLevel): CaseProfile => ({
  userId: 'user-1',
  employmentStage: EmploymentStage.ACTIVE_EMPLOYMENT,
  disclosureLevel: disclosure,
  barriers: [{ category: 'uncertainty', confidence: ConfidenceLevel.HIGH }],
  triggers: [],
  amplifiers: [],
  changeEvents: [],
  barrierCategories: ['uncertainty'],
  triggerCategories: [],
  hasActiveChangeEvent: false,
});

const makeRec = (id: string): PackagedRecommendation => ({
  templateId: id,
  stableRefId: `REC-${id}`,
  familyId: 'fam-1',
  audience: Audience.EMPLOYER,
  actorTags: ['manager'],
  timeHorizon: 'immediate',
  contentHe: 'test recommendation',
  score: 0.8,
  tracePath: {
    templateRefId: `REC-${id}`,
    barrierTags: ['uncertainty'],
    matchedBarriers: ['uncertainty'],
    employmentStage: 'active_employment',
    disclosureLevel: 'functional',
    score: 0.8,
    scoreDimensions: {},
  },
});

describe('Disclosure Filter', () => {
  it('allows all user-facing recommendations regardless of disclosure', () => {
    const result = applyDisclosureFilter(
      [makeRec('1')],
      Audience.USER,
      makeProfile(DisclosureLevel.NONE)
    );
    expect(result.allowed).toHaveLength(1);
    expect(result.filtered).toHaveLength(0);
  });

  it('blocks employer recommendations when disclosure is NONE', () => {
    const result = applyDisclosureFilter(
      [makeRec('1'), makeRec('2')],
      Audience.EMPLOYER,
      makeProfile(DisclosureLevel.NONE)
    );
    expect(result.allowed).toHaveLength(0);
    expect(result.filtered).toHaveLength(2);
  });

  it('allows employer recommendations with functional disclosure and strips trace details', () => {
    const result = applyDisclosureFilter(
      [makeRec('1')],
      Audience.EMPLOYER,
      makeProfile(DisclosureLevel.FUNCTIONAL)
    );
    expect(result.allowed).toHaveLength(1);
    expect(result.allowed[0].tracePath.matchedBarriers).toEqual([]);
    expect(result.allowed[0].tracePath.scoreDimensions).toEqual({});
  });

  it('strips personal trace from org-level recommendations', () => {
    const result = applyDisclosureFilter(
      [makeRec('1')],
      Audience.ORG,
      makeProfile(DisclosureLevel.FUNCTIONAL)
    );
    expect(result.allowed).toHaveLength(1);
    expect(result.allowed[0].tracePath.matchedBarriers).toEqual([]);
  });
});

describe('Barrier Description Filter', () => {
  it('returns empty for no disclosure', () => {
    const result = filterBarrierDescriptions(
      [{ category: 'uncertainty' }],
      DisclosureLevel.NONE
    );
    expect(result[0].functional).toBe('');
  });

  it('returns functional description for functional disclosure', () => {
    const result = filterBarrierDescriptions(
      [{ category: 'uncertainty' }],
      DisclosureLevel.FUNCTIONAL
    );
    expect(result[0].functional).toContain('שינויים');
    expect(result[0].detailed).toBeUndefined();
  });

  it('returns both for full disclosure', () => {
    const result = filterBarrierDescriptions(
      [{ category: 'uncertainty', description: 'specific detail' }],
      DisclosureLevel.FULL_VOLUNTARY
    );
    expect(result[0].functional).toBeTruthy();
    expect(result[0].detailed).toBe('specific detail');
  });
});
