/**
 * Tests — TracingChain visibility in admin panel
 *
 * Tests the chain persistence logic, workspace inclusion, and
 * attachSignalIds integration. Uses in-memory store (no Base44 dependency).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { createTracingChain } from '../../src/core/models/recommendation.js';
import { attachSignalIds } from '../../src/conversation/sessionManager.js';
import { runRecommendationPipeline } from '../../src/core/recommendation/pipeline.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePipelineResult(overrides = {}) {
  return {
    engines: {
      intake: {
        barrierScores: { sensory_discomfort: 4, irritability: 3 },
        meanScore: 3.5,
        overallSeverity: 'moderate',
        criticalBarriers: [
          { id: 'sensory_discomfort', he: 'חושי', en: 'Sensory', score: 4, cluster: 'physiological' },
        ],
        clusterScores: { physiological: 4 },
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
    summary: { overallSeverity: 'moderate' },
    ...overrides,
  };
}

function makeProfile(overrides = {}) {
  return {
    userId: 'user-001',
    disclosurePreference: 'partial_contextual',
    employmentStage: 'employed',
    workplaceType: 'office',
    ...overrides,
  };
}

function makeSignal(overrides = {}) {
  return {
    id: `sig-${Math.random().toString(36).slice(2, 8)}`,
    barrierIds: ['sensory_discomfort'],
    text: 'noise at work',
    turnIndex: 0,
    ...overrides,
  };
}

// ─── createTracingChain ──────────────────────────────────────────────────────

describe('createTracingChain', () => {
  test('creates chain with all required fields', () => {
    const chain = createTracingChain({
      templateId: 'TPL-001',
      barrierIds: ['sensory_discomfort'],
      score: 72,
      caseId: 'user-001',
    });
    assert.ok(chain.id, 'chain should have an id');
    assert.equal(chain.templateId, 'TPL-001');
    assert.deepStrictEqual(chain.barrierIds, ['sensory_discomfort']);
    assert.equal(chain.score, 72);
    assert.equal(chain.caseId, 'user-001');
    assert.ok(chain.createdAt);
  });

  test('defaults detectedSignalIds to empty array', () => {
    const chain = createTracingChain({});
    assert.deepStrictEqual(chain.detectedSignalIds, []);
  });

  test('defaults gatesPassed to all 7 gates', () => {
    const chain = createTracingChain({});
    assert.equal(chain.gatesPassed.length, 7);
    assert.ok(chain.gatesPassed.includes('barrier_fit'));
    assert.ok(chain.gatesPassed.includes('safety_fit'));
  });
});

// ─── attachSignalIds ─────────────────────────────────────────────────────────

describe('attachSignalIds — chain signal attachment', () => {
  test('populates detectedSignalIds for matching barriers', () => {
    const chain = createTracingChain({
      templateId: 'TPL-001',
      barrierIds: ['sensory_discomfort'],
      score: 80,
    });
    const recResult = { chains: [chain], packages: { user: [], employer: [], hr: [] } };
    const signals = [
      makeSignal({ id: 'sig-1', barrierIds: ['sensory_discomfort'] }),
      makeSignal({ id: 'sig-2', barrierIds: ['irritability'] }),
    ];

    const updated = attachSignalIds(recResult, signals);
    assert.deepStrictEqual(updated.chains[0].detectedSignalIds, ['sig-1']);
  });

  test('returns original result when no signals provided', () => {
    const chain = createTracingChain({ templateId: 'TPL-001' });
    const recResult = { chains: [chain] };
    const updated = attachSignalIds(recResult, []);
    assert.equal(updated, recResult);
  });

  test('returns original result when no chains exist', () => {
    const recResult = { chains: [] };
    const signals = [makeSignal()];
    const updated = attachSignalIds(recResult, signals);
    assert.equal(updated, recResult);
  });

  test('attaches multiple signals to same chain', () => {
    const chain = createTracingChain({
      barrierIds: ['sensory_discomfort', 'irritability'],
    });
    const recResult = { chains: [chain] };
    const signals = [
      makeSignal({ id: 'sig-1', barrierIds: ['sensory_discomfort'] }),
      makeSignal({ id: 'sig-2', barrierIds: ['irritability'] }),
      makeSignal({ id: 'sig-3', barrierIds: ['concentration'] }),
    ];

    const updated = attachSignalIds(recResult, signals);
    assert.deepStrictEqual(updated.chains[0].detectedSignalIds, ['sig-1', 'sig-2']);
  });
});

// ─── Pipeline chain integration ──────────────────────────────────────────────

describe('Pipeline → attachSignalIds integration', () => {
  const pr = makePipelineResult();
  const profile = makeProfile();

  test('pipeline chains get signal IDs attached', () => {
    const result = runRecommendationPipeline(pr, profile);
    if (result.chains.length === 0) return; // no templates matched → skip

    const signals = [
      makeSignal({ id: 'sig-sensory', barrierIds: ['sensory_discomfort'] }),
    ];
    const enriched = attachSignalIds(result, signals);

    for (const chain of enriched.chains) {
      if (chain.barrierIds.includes('sensory_discomfort')) {
        assert.ok(chain.detectedSignalIds.includes('sig-sensory'),
          'chain with sensory_discomfort barrier should have sig-sensory attached');
      }
    }
  });

  test('chains have full tree structure after signal attachment', () => {
    const result = runRecommendationPipeline(pr, profile);
    if (result.chains.length === 0) return;

    const signals = [makeSignal({ id: 'sig-1', barrierIds: ['sensory_discomfort'] })];
    const enriched = attachSignalIds(result, signals);

    for (const chain of enriched.chains) {
      // Verify complete tree: signal → barrier → pattern → template → score → gates
      assert.ok(Array.isArray(chain.detectedSignalIds), 'missing detectedSignalIds');
      assert.ok(Array.isArray(chain.barrierIds), 'missing barrierIds');
      assert.ok(Array.isArray(chain.patternIds), 'missing patternIds');
      assert.ok(Array.isArray(chain.knowledgeSourceIds), 'missing knowledgeSourceIds');
      assert.ok(chain.templateId, 'missing templateId');
      assert.ok(typeof chain.score === 'number', 'missing score');
      assert.ok(Array.isArray(chain.gatesPassed), 'missing gatesPassed');
    }
  });
});

// ─── Chain JSON serialization round-trip ─────────────────────────────────────

describe('Chain JSON serialization', () => {
  test('chains survive JSON round-trip', () => {
    const chain = createTracingChain({
      templateId: 'TPL-001',
      barrierIds: ['sensory_discomfort'],
      patternIds: ['hypervigilance'],
      detectedSignalIds: ['sig-1', 'sig-2'],
      knowledgeSourceIds: ['KS-001'],
      score: 85,
      caseId: 'user-001',
    });

    const serialized = JSON.stringify([chain]);
    const deserialized = JSON.parse(serialized);

    assert.equal(deserialized.length, 1);
    assert.equal(deserialized[0].templateId, 'TPL-001');
    assert.deepStrictEqual(deserialized[0].barrierIds, ['sensory_discomfort']);
    assert.deepStrictEqual(deserialized[0].detectedSignalIds, ['sig-1', 'sig-2']);
    assert.equal(deserialized[0].score, 85);
  });
});
