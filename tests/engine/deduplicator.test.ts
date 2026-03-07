import { describe, it, expect } from 'vitest';
import { deduplicateAndDiversify } from '../../src/core/engine/deduplicator';
import { ScoredTemplate } from '../../src/core/engine/scorer';

function makeScoredTemplate(
  id: string,
  familyId: string,
  score: number
): ScoredTemplate {
  return {
    template: {
      id,
      familyId,
      stableRefId: id,
      barrierTags: [],
      employmentStageTags: [],
      workplaceTypeTags: [],
      actorTags: [],
      disclosureSuitability: [],
      confidenceLevel: 'medium',
      lifecycleState: 'active',
      timeHorizon: 'immediate',
      contentHe: 'test',
      version: 1,
      contentEn: null,
      retrievalCount: 0,
      inclusionCount: 0,
      editCount: 0,
      approvalCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never,
    scores: {
      barrierRelevance: 0.5,
      triggerRelevance: 0.5,
      contextFit: 0.5,
      feasibility: 0.5,
      expectedImpact: 0.5,
      disclosureCompatibility: 0.5,
      evidenceStrength: 0.5,
      severityAlignment: 0.5,
      diversityContribution: 0.5,
    },
    compositeScore: score,
  };
}

describe('Deduplicator', () => {
  it('limits per family', () => {
    const items = [
      makeScoredTemplate('a', 'fam-1', 0.9),
      makeScoredTemplate('b', 'fam-1', 0.8),
      makeScoredTemplate('c', 'fam-1', 0.7),
    ];
    const result = deduplicateAndDiversify(items, 2, 10);
    expect(result.selected).toHaveLength(2);
    expect(result.dropped).toHaveLength(1);
  });

  it('limits total', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeScoredTemplate(`t-${i}`, `fam-${i}`, 0.9 - i * 0.05)
    );
    const result = deduplicateAndDiversify(items, 2, 6);
    expect(result.selected).toHaveLength(6);
  });

  it('preserves order', () => {
    const items = [
      makeScoredTemplate('a', 'fam-1', 0.9),
      makeScoredTemplate('b', 'fam-2', 0.8),
      makeScoredTemplate('c', 'fam-3', 0.7),
    ];
    const result = deduplicateAndDiversify(items, 2, 10);
    expect(result.selected.map((s) => s.template.id)).toEqual(['a', 'b', 'c']);
  });
});
