import { describe, it, expect } from 'vitest';
import { assessConfidence } from '../../src/core/engine/confidence';
import { CaseProfile } from '../../src/core/engine/case-profiler';
import { PackagedOutput, PackagedRecommendation } from '../../src/core/engine/packager';
import { EmploymentStage, DisclosureLevel, ConfidenceLevel, Audience } from '../../src/core/types/enums';

const makeProfile = (overrides: Partial<CaseProfile> = {}): CaseProfile => ({
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
  ...overrides,
});

const makeRec = (score: number): PackagedRecommendation => ({
  templateId: 'tpl-1',
  stableRefId: 'REC-1',
  familyId: 'fam-1',
  audience: Audience.USER,
  actorTags: ['user_self'],
  timeHorizon: 'immediate',
  contentHe: 'test',
  score,
  tracePath: {
    templateRefId: 'REC-1',
    barrierTags: ['uncertainty'],
    matchedBarriers: ['uncertainty'],
    employmentStage: 'active_employment',
    disclosureLevel: 'functional',
    score,
    scoreDimensions: {},
  },
});

const makeOutput = (userScore = 0.8, employerScore = 0.8): PackagedOutput => ({
  userRecommendations: [makeRec(userScore)],
  employerRecommendations: [makeRec(employerScore)],
  orgRecommendations: [],
});

describe('Confidence Assessor', () => {
  it('returns human_review for escalate barriers even with high scores', () => {
    const profile = makeProfile({
      barriers: [{ category: 'uncertainty', confidence: ConfidenceLevel.ESCALATE }],
    });
    const result = assessConfidence(makeOutput(0.9, 0.9), profile);
    expect(result.type).toBe('human_review');
  });

  it('returns clarify when no barriers detected', () => {
    const profile = makeProfile({ barriers: [], barrierCategories: [] });
    const result = assessConfidence(makeOutput(), profile);
    expect(result.type).toBe('clarify');
  });

  it('returns resource_only when no recommendations', () => {
    const output: PackagedOutput = {
      userRecommendations: [],
      employerRecommendations: [],
      orgRecommendations: [],
    };
    const result = assessConfidence(output, makeProfile());
    expect(result.type).toBe('resource_only');
  });

  it('returns low_confidence_set for very low scores', () => {
    const result = assessConfidence(makeOutput(0.2, 0.2), makeProfile());
    expect(result.type).toBe('low_confidence_set');
  });

  it('returns proceed with medium for moderate scores', () => {
    const result = assessConfidence(makeOutput(0.4, 0.4), makeProfile());
    expect(result.type).toBe('proceed');
    if (result.type === 'proceed') {
      expect(result.confidence).toBe(ConfidenceLevel.MEDIUM);
    }
  });

  it('returns proceed with high for good scores', () => {
    const result = assessConfidence(makeOutput(0.8, 0.8), makeProfile());
    expect(result.type).toBe('proceed');
    if (result.type === 'proceed') {
      expect(result.confidence).toBe(ConfidenceLevel.HIGH);
    }
  });
});
