/**
 * Tests — Recommendation Pipeline + Disclosure Filter (Step 6)
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  meetsDisclosureLevel,
  DISCLOSURE_LEVELS,
  filterForEmployer,
  FIELD_RULES,
} from '../../src/core/recommendation/disclosureFilter.js';

import {
  buildCaseProfile,
  retrieveCandidates,
  applyEligibilityGates,
  scoreTemplate,
  deduplicateRecommendations,
  packageRecommendations,
  assignReviewStatus,
  runRecommendationPipeline,
} from '../../src/core/recommendation/pipeline.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePipelineResult(overrides = {}) {
  return {
    engines: {
      intake: {
        barrierScores: { sensory_discomfort: 4, authority: 3, communication: 2 },
        meanScore: 3.0,
        overallSeverity: 'high',
        criticalBarriers: [
          { id: 'sensory_discomfort', he: 'אי נוחות חושית', en: 'Sensory discomfort', score: 4, cluster: 'physiological' },
          { id: 'authority', he: 'קשיים עם סמכות', en: 'Authority issues', score: 3, cluster: 'relational' },
        ],
        clusterScores: { physiological: 3.5, relational: 2.5 },
        patterns: [
          { id: 'hypervigilance', he: 'היפרוויגיל', en: 'Hypervigilance' },
        ],
      },
      interpretation: {
        riskFlags: [{ id: 'burnout_risk', severity: 'medium', he: 'סיכון שחיקה', action_he: '' }],
        investmentPriorities: ['physical_env', 'management', 'schedule'],
        trajectory: 'stable',
      },
      translation: {
        recommendations: [
          {
            barrierId: 'sensory_discomfort',
            barrierName: 'Sensory discomfort',
            domain: 'physical_env',
            accommodations: [
              { action_he: 'אוזניות מבטלות רעש', action_en: 'Noise-cancelling headphones', cost: 'low', timeframe: null },
            ],
          },
          {
            barrierId: 'authority',
            barrierName: 'Authority issues',
            domain: 'management',
            accommodations: [
              { action_he: 'הכשרת מנהלים', action_en: 'Manager training', cost: 'medium', timeframe: null },
            ],
          },
        ],
        summary: { totalAccommodations: 5, zeroCostPercentage: 40 },
      },
      implementation: {
        applicableModules: [],
      },
      framing: {},
    },
    summary: {
      overallSeverity: 'high',
    },
    ...overrides,
  };
}

function makeProfile(overrides = {}) {
  return {
    userId: 'user-123',
    disclosurePreference: 'partial_contextual',
    employmentContext: {
      employmentStage: 'active_employment',
      workplaceType: 'office',
    },
    pendingFollowUp: null,
    changeEvents: [],
    ...overrides,
  };
}

function makeTemplate(overrides = {}) {
  return {
    id: 'TPL-TEST-001',
    familyId: 'FAM-sensory_discomfort',
    barrierTags: ['sensory_discomfort'],
    stageTags: ['active_employment'],
    workplaceTypeTags: [],
    actorTags: ['employer', 'hr'],
    disclosureSuitability: ['functional_only', 'partial_contextual', 'full_voluntary'],
    confidenceLevel: 'high',
    lifecycleState: 'active',
    domain: 'physical_env',
    action_he: 'אוזניות מבטלות רעש',
    action_en: 'Noise-cancelling headphones',
    cost: 'low',
    friction: 'sensory_overload',
    tracking: { retrievalCount: 0, inclusionCount: 0, editCount: 0, approvalCount: 0, usefulnessSignals: 0, staleAt: null },
    knowledgeSourceIds: [],
    ...overrides,
  };
}

// ─── Disclosure filter tests ───────────────────────────────────────────────────

describe('meetsDisclosureLevel', () => {
  test('no_disclosure meets no_disclosure', () => {
    assert.equal(meetsDisclosureLevel('no_disclosure', 'no_disclosure'), true);
  });
  test('functional_only meets no_disclosure', () => {
    assert.equal(meetsDisclosureLevel('functional_only', 'no_disclosure'), true);
  });
  test('functional_only does NOT meet partial_contextual', () => {
    assert.equal(meetsDisclosureLevel('functional_only', 'partial_contextual'), false);
  });
  test('full_voluntary meets all levels', () => {
    for (const level of DISCLOSURE_LEVELS) {
      assert.equal(meetsDisclosureLevel('full_voluntary', level), true);
    }
  });
});

describe('filterForEmployer — no_disclosure blocks', () => {
  test('throws immediately for no_disclosure', () => {
    const pr = makePipelineResult();
    const profile = makeProfile({ disclosurePreference: 'no_disclosure' });
    assert.throws(
      () => filterForEmployer(pr, profile, 'no_disclosure'),
      /blocked/
    );
  });
});

describe('filterForEmployer — functional_only', () => {
  const pr = makePipelineResult();
  const profile = makeProfile({ disclosurePreference: 'functional_only' });

  test('returns workImpactSummary', () => {
    const result = filterForEmployer(pr, profile, 'functional_only');
    assert.ok(result.workImpactSummary);
    assert.ok(result.workImpactSummary.overallImpactLevel);
  });

  test('does NOT return namedBarriers', () => {
    const result = filterForEmployer(pr, profile, 'functional_only');
    assert.equal(result.namedBarriers, undefined);
  });

  test('does NOT return recommendedAccommodations', () => {
    const result = filterForEmployer(pr, profile, 'functional_only');
    assert.equal(result.recommendedAccommodations, undefined);
  });

  test('returns generalAccommodationCategories', () => {
    const result = filterForEmployer(pr, profile, 'functional_only');
    assert.ok(Array.isArray(result.generalAccommodationCategories));
  });

  test('returns lectureOpportunitySignal', () => {
    const result = filterForEmployer(pr, profile, 'functional_only');
    assert.ok(result.lectureOpportunitySignal);
  });
});

describe('filterForEmployer — partial_contextual', () => {
  const pr = makePipelineResult();
  const profile = makeProfile({ disclosurePreference: 'partial_contextual' });

  test('includes namedBarriers', () => {
    const result = filterForEmployer(pr, profile, 'partial_contextual');
    assert.ok(Array.isArray(result.namedBarriers));
    assert.ok(result.namedBarriers.length > 0);
    assert.ok(result.namedBarriers[0].en); // functional name present
    assert.equal(result.namedBarriers[0].cluster, undefined); // no cluster at partial level
  });

  test('includes recommendedAccommodations', () => {
    const result = filterForEmployer(pr, profile, 'partial_contextual');
    assert.ok(Array.isArray(result.recommendedAccommodations));
  });

  test('does NOT include amplifiers', () => {
    const result = filterForEmployer(pr, profile, 'partial_contextual');
    assert.equal(result.amplifiers, undefined);
  });
});

describe('filterForEmployer — full_voluntary', () => {
  const pr = makePipelineResult();
  const profile = makeProfile({ disclosurePreference: 'full_voluntary' });

  test('includes amplifiers', () => {
    const result = filterForEmployer(pr, profile, 'full_voluntary');
    assert.ok(Array.isArray(result.amplifiers));
  });

  test('includes contextNotes', () => {
    const result = filterForEmployer(pr, profile, 'full_voluntary');
    assert.ok(result.contextNotes);
    assert.equal(result.contextNotes.employmentStage, 'active_employment');
  });

  test('namedBarriers include cluster at full_voluntary', () => {
    const result = filterForEmployer(pr, profile, 'full_voluntary');
    assert.ok(result.namedBarriers[0].cluster);
  });

  test('never includes diagnosis or raw quotes', () => {
    const result = filterForEmployer(pr, profile, 'full_voluntary');
    assert.equal(result.diagnosis, undefined);
    assert.equal(result.quotes, undefined);
  });
});

// ─── Pipeline: Step 1 — Case profiling ────────────────────────────────────────

describe('buildCaseProfile', () => {
  test('extracts barrierIds from criticalBarriers', () => {
    const pr = makePipelineResult();
    const profile = makeProfile();
    const cp = buildCaseProfile(pr, profile);
    assert.deepEqual(cp.barrierIds, ['sensory_discomfort', 'authority']);
  });

  test('uses profile disclosurePreference', () => {
    const pr = makePipelineResult();
    const profile = makeProfile({ disclosurePreference: 'functional_only' });
    const cp = buildCaseProfile(pr, profile);
    assert.equal(cp.disclosureLevel, 'functional_only');
  });

  test('defaults employmentStage to active_employment when missing', () => {
    const pr = makePipelineResult();
    const cp = buildCaseProfile(pr, null);
    assert.equal(cp.employmentStage, 'active_employment');
    assert.equal(cp.disclosureLevel, 'no_disclosure');
  });
});

// ─── Pipeline: Step 2 — Candidate retrieval ───────────────────────────────────

describe('retrieveCandidates', () => {
  test('returns candidates for matching barriers', () => {
    const candidates = retrieveCandidates(['sensory_discomfort']);
    assert.ok(candidates.length > 0);
    assert.ok(candidates.every(c => c.barrierTags.includes('sensory_discomfort')));
  });

  test('returns empty for unmatched barrier', () => {
    const candidates = retrieveCandidates(['nonexistent_barrier_xyz']);
    assert.equal(candidates.length, 0);
  });

  test('uses templateOverrides when provided', () => {
    const overrides = [makeTemplate()];
    const candidates = retrieveCandidates(['sensory_discomfort'], overrides);
    assert.deepEqual(candidates, overrides);
  });
});

// ─── Pipeline: Step 3 — Eligibility gating ───────────────────────────────────

describe('applyEligibilityGates', () => {
  const caseProfile = {
    barrierIds: ['sensory_discomfort'],
    employmentStage: 'active_employment',
    workplaceType: 'office',
    disclosureLevel: 'partial_contextual',
    riskFlags: [],
  };

  test('passes a fully eligible template', () => {
    const t = makeTemplate();
    const result = applyEligibilityGates(t, caseProfile);
    assert.equal(result.passed, true);
    assert.equal(result.failedGate, null);
  });

  test('fails barrier_fit when barrier not in case', () => {
    const t = makeTemplate({ barrierTags: ['authority'] });
    const result = applyEligibilityGates(t, caseProfile);
    assert.equal(result.passed, false);
    assert.equal(result.failedGate, 'barrier_fit');
  });

  test('fails stage_fit when stage mismatch', () => {
    const t = makeTemplate({ stageTags: ['job_seeking'] });
    const result = applyEligibilityGates(t, caseProfile);
    assert.equal(result.passed, false);
    assert.equal(result.failedGate, 'stage_fit');
  });

  test('fails disclosure_fit when template only suits full_voluntary', () => {
    const t = makeTemplate({ disclosureSuitability: ['full_voluntary'] });
    const result = applyEligibilityGates(t, { ...caseProfile, disclosureLevel: 'functional_only' });
    assert.equal(result.passed, false);
    assert.equal(result.failedGate, 'disclosure_fit');
  });

  test('fails safety_fit for trigger-exposing template in distress case', () => {
    const t = makeTemplate({ friction: 'trigger_exposure' });
    const distressProfile = { ...caseProfile, riskFlags: ['distress_risk'] };
    const result = applyEligibilityGates(t, distressProfile);
    assert.equal(result.passed, false);
    assert.equal(result.failedGate, 'safety_fit');
  });

  test('fails freshness_fit for stale template', () => {
    const t = makeTemplate({ tracking: { ...makeTemplate().tracking, staleAt: '2020-01-01T00:00:00.000Z' } });
    const result = applyEligibilityGates(t, caseProfile);
    assert.equal(result.passed, false);
    assert.equal(result.failedGate, 'freshness_fit');
  });
});

// ─── Pipeline: Step 4 — Scoring ───────────────────────────────────────────────

describe('scoreTemplate', () => {
  const caseProfile = {
    barrierIds: ['sensory_discomfort'],
    barrierScores: { sensory_discomfort: 5 },
    employmentStage: 'active_employment',
    workplaceType: 'office',
    disclosureLevel: 'partial_contextual',
    riskFlags: [],
    investmentPriorities: ['physical_env'],
  };

  test('returns a number between 0 and 100', () => {
    const t = makeTemplate();
    const score = scoreTemplate(t, caseProfile);
    assert.ok(score >= 0 && score <= 100, `Expected 0–100, got ${score}`);
  });

  test('high barrier score and priority domain yields high score', () => {
    const t = makeTemplate({ cost: 'zero', domain: 'physical_env' });
    const score = scoreTemplate(t, caseProfile);
    assert.ok(score >= 70, `Expected ≥70, got ${score}`);
  });

  test('diversity bonus: new family scores higher than already-covered family', () => {
    const t = makeTemplate();
    const covered = new Set(['FAM-sensory_discomfort']);
    const scoreNew = scoreTemplate(t, caseProfile, new Set());
    const scoreDup = scoreTemplate(t, caseProfile, covered);
    assert.ok(scoreNew > scoreDup);
  });
});

// ─── Pipeline: Step 5 — Deduplication ─────────────────────────────────────────

describe('deduplicateRecommendations', () => {
  test('keeps at most maxPerFamily per family', () => {
    const ranked = [
      { template: makeTemplate({ id: 'A', familyId: 'FAM-1' }), score: 90 },
      { template: makeTemplate({ id: 'B', familyId: 'FAM-1' }), score: 80 },
      { template: makeTemplate({ id: 'C', familyId: 'FAM-1' }), score: 70 },
    ];
    const result = deduplicateRecommendations(ranked, { maxPerFamily: 2 });
    const fam1 = result.filter(r => r.template.familyId === 'FAM-1');
    assert.equal(fam1.length, 2);
  });

  test('respects maxTotal', () => {
    const ranked = Array.from({ length: 15 }, (_, i) => ({
      template: makeTemplate({ id: `T${i}`, familyId: `FAM-${i}` }),
      score: 90 - i,
    }));
    const result = deduplicateRecommendations(ranked, { maxTotal: 5 });
    assert.equal(result.length, 5);
  });
});

// ─── Pipeline: Step 7 — Review assignment ─────────────────────────────────────

describe('assignReviewStatus', () => {
  test('high confidence + score ≥ 70 → approved', () => {
    assert.equal(assignReviewStatus(80, 'high'), 'approved');
  });
  test('low confidence → rejected', () => {
    assert.equal(assignReviewStatus(80, 'low'), 'rejected');
  });
  test('score < 50 → rejected', () => {
    assert.equal(assignReviewStatus(40, 'medium'), 'rejected');
  });
  test('medium confidence + mid score → pending', () => {
    assert.equal(assignReviewStatus(60, 'medium'), 'pending');
  });
});

// ─── Full pipeline integration ────────────────────────────────────────────────

describe('runRecommendationPipeline — integration', () => {
  const pr = makePipelineResult();
  const profile = makeProfile();

  test('returns a result with all expected keys', () => {
    const result = runRecommendationPipeline(pr, profile);
    assert.ok(result.caseProfile);
    assert.ok(typeof result.candidates === 'number');
    assert.ok(typeof result.eligible === 'number');
    assert.ok(Array.isArray(result.selected));
    assert.ok(result.packages);
    assert.ok(Array.isArray(result.packages.user));
    assert.ok(Array.isArray(result.packages.employer));
    assert.ok(result.summary);
  });

  test('eligible count ≤ candidate count', () => {
    const result = runRecommendationPipeline(pr, profile);
    assert.ok(result.eligible <= result.candidates);
  });

  test('selected count ≤ eligible count', () => {
    const result = runRecommendationPipeline(pr, profile);
    assert.ok(result.selected.length <= result.eligible);
  });

  test('user package contains rendered recommendations with reviewStatus', () => {
    const result = runRecommendationPipeline(pr, profile);
    if (result.packages.user.length > 0) {
      const rec = result.packages.user[0];
      assert.ok(rec.templateId);
      assert.ok(rec.renderedText?.he);
      assert.ok(['approved', 'pending'].includes(rec.reviewStatus));
    }
  });

  test('no_disclosure profile yields empty employer package', () => {
    const noDisclProfile = makeProfile({ disclosurePreference: 'no_disclosure' });
    const result = runRecommendationPipeline(pr, noDisclProfile);
    assert.equal(result.packages.employer.length, 0);
  });

  test('templateOverrides respected', () => {
    const overrides = [makeTemplate()];
    const result = runRecommendationPipeline(pr, profile, { templateOverrides: overrides });
    assert.equal(result.candidates, 1);
  });

  test('summary reports autoApproved count', () => {
    const result = runRecommendationPipeline(pr, profile);
    assert.ok(typeof result.summary.autoApproved === 'number');
    assert.ok(typeof result.summary.pendingReview === 'number');
    assert.ok(result.summary.totalSelected >= 0);
  });
});

// ─── TracingChain (FPP §9.6 Non-Negotiable 2) ─────────────────────────────────

import { createTracingChain } from '../../src/core/models/recommendation.js';
import { resetStore } from '../../src/admin/store.js';

beforeEach(() => resetStore());

describe('createTracingChain', () => {
  test('creates chain with stable id and default fields', () => {
    const chain = createTracingChain({ templateId: 'TPL-001', score: 72 });
    assert.ok(chain.id);
    assert.equal(chain.templateId, 'TPL-001');
    assert.equal(chain.score, 72);
    assert.deepEqual(chain.detectedSignalIds, []);
    assert.ok(chain.gatesPassed.length === 7);
    assert.ok(chain.createdAt);
  });

  test('patternIds and barrierIds are stored', () => {
    const chain = createTracingChain({
      barrierIds: ['sensory_discomfort'],
      patternIds: ['hypervigilance'],
      knowledgeSourceIds: ['src-1'],
    });
    assert.deepEqual(chain.barrierIds, ['sensory_discomfort']);
    assert.deepEqual(chain.patternIds, ['hypervigilance']);
    assert.deepEqual(chain.knowledgeSourceIds, ['src-1']);
  });

  test('two chains have distinct ids', () => {
    const c1 = createTracingChain({});
    const c2 = createTracingChain({});
    assert.notEqual(c1.id, c2.id);
  });
});

describe('runRecommendationPipeline — TracingChain output', () => {
  const pr = makePipelineResult({
    engines: {
      intake: {
        barrierScores: { sensory_discomfort: 4, irritability: 4 },
        meanScore: 4.0,
        overallSeverity: 'high',
        criticalBarriers: [
          { id: 'sensory_discomfort', he: 'חושי', en: 'Sensory', score: 4, cluster: 'physiological' },
          { id: 'irritability', he: 'רגזנות', en: 'Irritability', score: 4, cluster: 'emotional' },
        ],
        clusterScores: { physiological: 4, emotional: 4 },
        patterns: [
          { id: 'hypervigilance', barriers: ['sensory_discomfort', 'irritability'], he: '', en: 'Hypervigilance' },
        ],
      },
      interpretation: {
        riskFlags: [],
        investmentPriorities: ['physical_env'],
        trajectory: null,
      },
      translation: { recommendations: [], summary: { totalAccommodations: 0, zeroCostPercentage: 0 } },
      implementation: { applicableModules: [] },
      framing: {},
    },
    summary: { overallSeverity: 'high' },
  });
  const profile = makeProfile({ disclosurePreference: 'partial_contextual' });

  test('result includes chains array', () => {
    const result = runRecommendationPipeline(pr, profile);
    assert.ok(Array.isArray(result.chains));
  });

  test('one chain per selected recommendation', () => {
    const result = runRecommendationPipeline(pr, profile);
    assert.equal(result.chains.length, result.selected.length);
  });

  test('each chain has id, templateId, barrierIds, score', () => {
    const result = runRecommendationPipeline(pr, profile);
    for (const chain of result.chains) {
      assert.ok(chain.id, 'chain.id missing');
      assert.ok(chain.templateId, 'chain.templateId missing');
      assert.ok(Array.isArray(chain.barrierIds), 'chain.barrierIds not array');
      assert.ok(typeof chain.score === 'number', 'chain.score not number');
    }
  });

  test('chains with pattern-matching barriers include patternId', () => {
    const tpl = makeTemplate({
      id: 'TPL-SENSORY-001',
      version: '1.0',
      barrierTags: ['sensory_discomfort'],
    });
    const prWithPatterns = { ...pr };
    const result = runRecommendationPipeline(prWithPatterns, profile, { templateOverrides: [tpl] });
    const chain = result.chains[0];
    if (chain) {
      // hypervigilance pattern includes sensory_discomfort
      assert.ok(chain.patternIds.includes('hypervigilance'),
        `expected hypervigilance in ${JSON.stringify(chain.patternIds)}`);
    }
  });

  test('chain recommendationId matches rendered recommendation id', () => {
    const result = runRecommendationPipeline(pr, profile);
    for (const chain of result.chains) {
      if (chain.recommendationId) {
        const match = result.packages.user.find(r => r.id === chain.recommendationId);
        assert.ok(match, `no user rec found for chain.recommendationId=${chain.recommendationId}`);
      }
    }
  });

  test('chain caseId matches profile userId', () => {
    const result = runRecommendationPipeline(pr, profile);
    for (const chain of result.chains) {
      assert.equal(chain.caseId, profile.userId);
    }
  });

  test('chains with injected template carry correct barrierIds', () => {
    const tpl = makeTemplate({ barrierTags: ['sensory_discomfort', 'authority'] });
    const result = runRecommendationPipeline(pr, profile, { templateOverrides: [tpl] });
    const chain = result.chains[0];
    if (chain) {
      assert.ok(chain.barrierIds.includes('sensory_discomfort'));
    }
  });
});
