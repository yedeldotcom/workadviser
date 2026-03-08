import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BARRIER_IDS, BARRIERS, validateResponses, scoreResponses } from '../src/engines/intake/index.js';
import { interpretProfile } from '../src/engines/interpretation/index.js';
import { translateToWorkplace } from '../src/engines/translation/index.js';
import { generateImplementationPlan } from '../src/engines/implementation/index.js';
import { generateFraming } from '../src/engines/framing/index.js';
import { runPipeline } from '../src/pipeline/index.js';

const makeResponses = (defaultScore = 3) =>
  Object.fromEntries(BARRIERS.map(b => [b.id, defaultScore]));

describe('Engine 1: Intake', () => {
  it('validates complete responses', () => {
    const result = validateResponses(makeResponses(3));
    assert.strictEqual(result.valid, true);
  });

  it('rejects missing barriers', () => {
    const result = validateResponses({ fatigue: 3 });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('rejects out-of-range scores', () => {
    const responses = makeResponses(3);
    responses.fatigue = 6;
    const result = validateResponses(responses);
    assert.strictEqual(result.valid, false);
  });

  it('scores 13 barriers correctly', () => {
    const profile = scoreResponses(makeResponses(3));
    assert.strictEqual(profile.totalScore, 39);
    assert.strictEqual(profile.meanScore, 3);
    assert.strictEqual(profile.barrierScores.length, 13);
    assert.ok(profile.clusterScores.physiological);
  });

  it('detects hypervigilance pattern', () => {
    const responses = makeResponses(2);
    responses[BARRIER_IDS.IRRITABILITY] = 4;
    responses[BARRIER_IDS.SENSORY_DISCOMFORT] = 4;
    const profile = scoreResponses(responses);
    assert.ok(profile.patterns.some(p => p.id === 'hypervigilance'));
  });

  it('detects cognitive overload pattern', () => {
    const responses = makeResponses(2);
    responses[BARRIER_IDS.PROCRASTINATION] = 4;
    responses[BARRIER_IDS.CONCENTRATION] = 4;
    responses[BARRIER_IDS.TIME_MANAGEMENT] = 4;
    const profile = scoreResponses(responses);
    assert.ok(profile.patterns.some(p => p.id === 'cognitive_overload'));
  });
});

describe('Engine 2: Interpretation', () => {
  it('interprets a profile with risk flags', () => {
    const responses = makeResponses(2);
    responses[BARRIER_IDS.IRRITABILITY] = 5;
    responses[BARRIER_IDS.SENSORY_DISCOMFORT] = 5;
    responses[BARRIER_IDS.ANXIETY_ATTACKS] = 4;
    const profile = scoreResponses(responses);
    const interp = interpretProfile(profile, 'early');
    assert.ok(interp.riskFlags.some(f => f.id === 'crisis_risk'));
    assert.ok(interp.investmentPriorities.length > 0);
  });

  it('generates narrative for low-barrier profile', () => {
    const profile = scoreResponses(makeResponses(1));
    const interp = interpretProfile(profile, 'pre_employment');
    assert.ok(interp.narrative.en.includes('generally low'));
  });
});

describe('Engine 3: Translation', () => {
  it('produces workplace recommendations for critical barriers', () => {
    const responses = makeResponses(2);
    responses[BARRIER_IDS.SENSORY_DISCOMFORT] = 5;
    responses[BARRIER_IDS.AUTHORITY] = 4;
    const profile = scoreResponses(responses);
    const interp = interpretProfile(profile);
    const translation = translateToWorkplace(interp);
    assert.ok(translation.recommendations.length > 0);
    assert.ok(translation.summary.zeroCostPercentage > 0);
  });
});

describe('Engine 4: Implementation', () => {
  it('generates procedure modules matching barriers', () => {
    const responses = makeResponses(4);
    const profile = scoreResponses(responses);
    const interp = interpretProfile(profile);
    const translation = translateToWorkplace(interp);
    const plan = generateImplementationPlan(translation, 'intermediate');
    assert.ok(plan.applicableModules.length > 0);
    assert.ok(plan.byRole.manager?.length > 0);
    assert.ok(plan.byRole.hr?.length > 0);
  });

  it('filters modules by readiness level', () => {
    const responses = makeResponses(4);
    const profile = scoreResponses(responses);
    const interp = interpretProfile(profile);
    const translation = translateToWorkplace(interp);
    const basicPlan = generateImplementationPlan(translation, 'basic');
    const intermediatePlan = generateImplementationPlan(translation, 'intermediate');
    assert.ok(intermediatePlan.applicableModules.length >= basicPlan.applicableModules.length);
  });
});

describe('Engine 5: Framing', () => {
  it('generates audience-specific framing', () => {
    const responses = makeResponses(4);
    const profile = scoreResponses(responses);
    const interp = interpretProfile(profile);
    const translation = translateToWorkplace(interp);
    const plan = generateImplementationPlan(translation);
    const framing = generateFraming(plan, 'hr');
    assert.ok(framing.coreMessages.length > 0);
    assert.ok(framing.narrative.what_happens);
    assert.ok(framing.narrative.monday_morning);
    assert.ok(framing.objectionResponses.length > 0);
  });
});

describe('Full Pipeline', () => {
  it('runs end-to-end and produces valid output', () => {
    const result = runPipeline({
      responses: makeResponses(3),
      phase: 'early',
      orgReadiness: 'basic',
      audience: 'hr',
    });
    assert.ok(result.engines.intake);
    assert.ok(result.engines.interpretation);
    assert.ok(result.engines.translation);
    assert.ok(result.engines.implementation);
    assert.ok(result.engines.framing);
    assert.ok(result.summary.overallSeverity);
    assert.ok(typeof result.summary.zeroCostPercentage === 'number');
  });

  it('handles minimal barrier profile', () => {
    const result = runPipeline({ responses: makeResponses(1) });
    assert.strictEqual(result.summary.criticalBarriersCount, 0);
    assert.strictEqual(result.summary.overallSeverity.level, 'low');
  });

  it('handles maximal barrier profile', () => {
    const result = runPipeline({ responses: makeResponses(5) });
    assert.strictEqual(result.summary.criticalBarriersCount, 13);
    assert.strictEqual(result.summary.overallSeverity.level, 'high');
    assert.ok(result.summary.patternsDetected.length > 0);
  });
});
