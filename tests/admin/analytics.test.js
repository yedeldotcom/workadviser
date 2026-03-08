/**
 * Tests — Gap Visibility + Recommendation Analytics (Step 10)
 * Covers: gapVisibility.js and recommendationAnalytics.js
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  weakZones, highOutputLowEvidence, repeatedAdminCorrections,
  highConflictAreas, suggestNewSourceTypes, coverageSummary,
  EMPLOYMENT_STAGES, WORKPLACE_TYPES, ACTOR_TYPES,
} from '../../src/admin/gapVisibility.js';

import {
  retrievalFrequency, inclusionFrequency, approvalRate, staleRate,
  templateSummary, promoteKnowledgeItem, deIdentifyForPromotion,
  incrementTracking, markTemplateStale, createFeedback,
} from '../../src/admin/recommendationAnalytics.js';

import {
  resetStore, saveKnowledgeItem, getKnowledgeItem, getAllAuditLogs,
} from '../../src/admin/store.js';
import { createRecommendationTemplate } from '../../src/core/models/recommendation.js';
import { createKnowledgeItem } from '../../src/core/models/knowledgeItem.js';
import { BARRIERS } from '../../src/engines/intake/barriers.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTemplate(overrides = {}) {
  return createRecommendationTemplate({
    barrierTags: ['fatigue'],
    stageTags: ['active_employment'],
    workplaceTypeTags: ['office'],
    actorTags: ['hr'],
    confidenceLevel: 'high',
    lifecycleState: 'active',
    knowledgeSourceIds: ['SRC-001', 'SRC-002'],
    tracking: {
      retrievalCount: 5,
      inclusionCount: 3,
      editCount: 0,
      approvalCount: 3,
      usefulnessSignals: 2,
      staleAt: null,
    },
    ...overrides,
  });
}

function makeKnowledgeItem(overrides = {}) {
  return createKnowledgeItem({
    type: 'barrier_definition',
    barrierTags: ['fatigue'],
    stageTags: ['active_employment'],
    workplaceTypeTags: ['office'],
    lifecycleState: 'active',
    promotionState: 'case_only',
    ...overrides,
  });
}

beforeEach(() => resetStore());

// ─── Gap Visibility: weakZones ────────────────────────────────────────────────

describe('weakZones', () => {
  test('returns zones for uncovered barrier/stage/workplace combinations', () => {
    // Single template covering only fatigue × active_employment × office
    const templates = [makeTemplate()];
    const items = [];
    const zones = weakZones(templates, items);

    // Should have many uncovered zones (13 barriers × 6 stages × 4 workplaces = 312 cells, minus 1)
    assert.ok(zones.length > 0);
    // No zone should be the covered cell
    const covered = zones.find(
      z => z.barrier === 'fatigue' && z.stage === 'active_employment' && z.workplaceType === 'office'
    );
    assert.equal(covered, undefined);
  });

  test('returns knowledge gap (gapType=knowledge) when no items AND no template', () => {
    const zones = weakZones([], []);
    const knowledgeZones = zones.filter(z => z.gapType === 'knowledge');
    assert.ok(knowledgeZones.length > 0);
    // All should be knowledge gaps when there's nothing at all
    assert.equal(knowledgeZones.length, zones.length);
  });

  test('returns logic gap (gapType=logic) when items exist but no template', () => {
    const items = [makeKnowledgeItem()]; // fatigue × active_employment × office (knowledge exists)
    const zones = weakZones([], items);
    // The zone for that specific combination should be logic gap
    const logicZone = zones.find(
      z => z.barrier === 'fatigue' && z.stage === 'active_employment' && z.workplaceType === 'office'
    );
    assert.ok(logicZone);
    assert.equal(logicZone.gapType, 'logic');
  });

  test('returns rule gap (gapType=rule) when all covering templates are low confidence', () => {
    const templates = [makeTemplate({ confidenceLevel: 'low' })];
    const zones = weakZones(templates, []);
    const ruleZone = zones.find(
      z => z.barrier === 'fatigue' && z.stage === 'active_employment' && z.workplaceType === 'office'
    );
    assert.ok(ruleZone);
    assert.equal(ruleZone.gapType, 'rule');
  });

  test('any tag covers all values on that dimension', () => {
    const anyTemplate = makeTemplate({
      barrierTags: ['any'],
      stageTags: ['any'],
      workplaceTypeTags: ['any'],
    });
    const zones = weakZones([anyTemplate], []);
    // All cells should be covered — no weak zones
    assert.equal(zones.length, 0);
  });

  test('deprecated templates do not count as coverage', () => {
    const deprecated = makeTemplate({ lifecycleState: 'deprecated' });
    const zones = weakZones([deprecated], []);
    const fatigue = zones.find(
      z => z.barrier === 'fatigue' && z.stage === 'active_employment' && z.workplaceType === 'office'
    );
    assert.ok(fatigue); // Deprecated shouldn't cover
  });

  test('returns an array', () => {
    assert.ok(Array.isArray(weakZones([], [])));
  });
});

// ─── highOutputLowEvidence ────────────────────────────────────────────────────

describe('highOutputLowEvidence', () => {
  test('flags low-confidence templates with high inclusion count', () => {
    const t = makeTemplate({
      confidenceLevel: 'low',
      tracking: { ...makeTemplate().tracking, inclusionCount: 5 },
    });
    const result = highOutputLowEvidence([t]);
    assert.ok(result.some(r => r.templateId === t.id));
    assert.equal(result.find(r => r.templateId === t.id).evidenceRisk, 'high');
  });

  test('flags templates with too few knowledge sources', () => {
    const t = makeTemplate({
      knowledgeSourceIds: ['SRC-001'], // Only 1 source, min is 2
      tracking: { ...makeTemplate().tracking, inclusionCount: 5 },
    });
    const result = highOutputLowEvidence([t], 3, 2);
    assert.ok(result.some(r => r.templateId === t.id));
    assert.equal(result.find(r => r.templateId === t.id).evidenceRisk, 'medium');
  });

  test('does not flag high-confidence, well-sourced templates', () => {
    const t = makeTemplate(); // high confidence, 2 sources, inclusionCount=3
    const result = highOutputLowEvidence([t], 2, 2);
    assert.equal(result.filter(r => r.templateId === t.id).length, 0);
  });

  test('respects minInclusions threshold', () => {
    const t = makeTemplate({
      confidenceLevel: 'low',
      tracking: { ...makeTemplate().tracking, inclusionCount: 1 },
    });
    const result = highOutputLowEvidence([t], 5); // threshold=5, inclusionCount=1
    assert.equal(result.length, 0);
  });
});

// ─── repeatedAdminCorrections ─────────────────────────────────────────────────

describe('repeatedAdminCorrections', () => {
  test('flags templates with high edit rate', () => {
    const t = makeTemplate({
      tracking: { ...makeTemplate().tracking, editCount: 4, approvalCount: 4 },
    }); // editRate = 1.0
    const result = repeatedAdminCorrections([t], 0.5, 2);
    assert.ok(result.some(r => r.templateId === t.id));
    assert.equal(result.find(r => r.templateId === t.id).severity, 'critical');
  });

  test('assigns severity=high for 0.75 <= editRate < 1.0', () => {
    const t = makeTemplate({
      tracking: { ...makeTemplate().tracking, editCount: 3, approvalCount: 4 },
    }); // editRate = 0.75
    const result = repeatedAdminCorrections([t], 0.5, 2);
    assert.equal(result.find(r => r.templateId === t.id).severity, 'high');
  });

  test('assigns severity=medium for 0.5 <= editRate < 0.75', () => {
    const t = makeTemplate({
      tracking: { ...makeTemplate().tracking, editCount: 2, approvalCount: 4 },
    }); // editRate = 0.5
    const result = repeatedAdminCorrections([t], 0.5, 2);
    assert.equal(result.find(r => r.templateId === t.id).severity, 'medium');
  });

  test('ignores templates with fewer than minApprovals', () => {
    const t = makeTemplate({
      tracking: { ...makeTemplate().tracking, editCount: 10, approvalCount: 1 },
    });
    const result = repeatedAdminCorrections([t], 0.5, 2);
    assert.equal(result.length, 0);
  });
});

// ─── highConflictAreas ────────────────────────────────────────────────────────

describe('highConflictAreas', () => {
  test('flags templates with rejection rate above threshold', () => {
    const t = makeTemplate({
      tracking: { ...makeTemplate().tracking, approvalCount: 2 },
    });
    const auditLogs = [
      { action: 'report_rejected', diff: { templateId: t.id } },
      { action: 'report_rejected', diff: { templateId: t.id } },
    ];
    const result = highConflictAreas([t], auditLogs, 0.3);
    assert.ok(result.some(r => r.templateId === t.id));
    const entry = result.find(r => r.templateId === t.id);
    assert.equal(entry.rejectionCount, 2);
    assert.ok(entry.rejectionRate > 0.3);
  });

  test('does not flag templates with low rejection rate', () => {
    const t = makeTemplate({
      tracking: { ...makeTemplate().tracking, approvalCount: 10 },
    });
    const auditLogs = [{ action: 'report_rejected', diff: { templateId: t.id } }];
    const result = highConflictAreas([t], auditLogs, 0.3);
    // 1/(10+1) = 0.09 < 0.3 → not flagged
    assert.equal(result.length, 0);
  });

  test('returns empty for no audit logs', () => {
    const t = makeTemplate();
    assert.deepEqual(highConflictAreas([t], [], 0.3), []);
  });
});

// ─── suggestNewSourceTypes ────────────────────────────────────────────────────

describe('suggestNewSourceTypes', () => {
  test('suggests empirical_research for knowledge gaps', () => {
    const zones = [
      { barrier: 'fatigue', stage: 'active_employment', workplaceType: 'office', gapType: 'knowledge', templateCount: 0, activeTemplates: 0 },
      { barrier: 'anxiety_attacks', stage: 'job_seeking', workplaceType: 'remote', gapType: 'knowledge', templateCount: 0, activeTemplates: 0 },
      { barrier: 'concentration', stage: 'on_leave', workplaceType: 'hybrid', gapType: 'knowledge', templateCount: 0, activeTemplates: 0 },
    ];
    const suggestions = suggestNewSourceTypes(zones);
    assert.ok(suggestions.some(s => s.sourceType === 'empirical_research'));
    const first = suggestions.find(s => s.sourceType === 'empirical_research');
    assert.equal(first.priority, 1);
  });

  test('suggests practitioner_guide for logic gaps', () => {
    const zones = [
      { barrier: 'fatigue', stage: 'active_employment', workplaceType: 'office', gapType: 'logic', templateCount: 0, activeTemplates: 0 },
    ];
    const suggestions = suggestNewSourceTypes(zones);
    assert.ok(suggestions.some(s => s.sourceType === 'practitioner_guide'));
  });

  test('suggests expert_protocol for rule gaps', () => {
    const zones = [
      { barrier: 'fatigue', stage: 'active_employment', workplaceType: 'office', gapType: 'rule', templateCount: 1, activeTemplates: 1 },
    ];
    const suggestions = suggestNewSourceTypes(zones);
    assert.ok(suggestions.some(s => s.sourceType === 'expert_protocol'));
  });

  test('returns empty for no gaps', () => {
    assert.deepEqual(suggestNewSourceTypes([]), []);
  });
});

// ─── coverageSummary ─────────────────────────────────────────────────────────

describe('coverageSummary', () => {
  test('totalCells = barriers × stages × workplaceTypes', () => {
    const zones = [];
    const summary = coverageSummary(zones);
    const expected = BARRIERS.length * EMPLOYMENT_STAGES.length * WORKPLACE_TYPES.length;
    assert.equal(summary.totalCells, expected);
  });

  test('coveragePercent = 100 when no gaps', () => {
    const summary = coverageSummary([]);
    assert.equal(summary.coveragePercent, 100);
  });

  test('counts gap types correctly', () => {
    const zones = [
      { barrier: 'fatigue', stage: 'active_employment', workplaceType: 'office', gapType: 'knowledge' },
      { barrier: 'fatigue', stage: 'job_seeking', workplaceType: 'office', gapType: 'logic' },
      { barrier: 'fatigue', stage: 'on_leave', workplaceType: 'office', gapType: 'rule' },
    ];
    const summary = coverageSummary(zones);
    assert.equal(summary.knowledgeGaps, 1);
    assert.equal(summary.logicGaps, 1);
    assert.equal(summary.ruleGaps, 1);
    assert.equal(summary.coveredCells, summary.totalCells - 3);
  });

  test('worstBarriers identifies barrier with most gaps', () => {
    const zones = [
      { barrier: 'fatigue', stage: 'active_employment', workplaceType: 'office', gapType: 'knowledge' },
      { barrier: 'fatigue', stage: 'job_seeking', workplaceType: 'office', gapType: 'knowledge' },
      { barrier: 'anxiety_attacks', stage: 'active_employment', workplaceType: 'office', gapType: 'knowledge' },
    ];
    const summary = coverageSummary(zones);
    assert.equal(summary.worstBarriers[0].barrier, 'fatigue');
    assert.equal(summary.worstBarriers[0].zoneCount, 2);
  });
});

// ─── Recommendation Analytics: retrievalFrequency / inclusionFrequency ─────────

describe('retrievalFrequency', () => {
  test('computes rate as count/totalCases', () => {
    const t = makeTemplate({ tracking: { ...makeTemplate().tracking, retrievalCount: 10 } });
    const result = retrievalFrequency([t], 50);
    assert.equal(result[0].count, 10);
    assert.equal(result[0].rate, 0.2);
  });

  test('returns rate=0 when totalCases=0', () => {
    const t = makeTemplate();
    const result = retrievalFrequency([t], 0);
    assert.equal(result[0].rate, 0);
  });

  test('sorted by count descending', () => {
    const t1 = makeTemplate({ tracking: { ...makeTemplate().tracking, retrievalCount: 1 } });
    const t2 = makeTemplate({ tracking: { ...makeTemplate().tracking, retrievalCount: 10 } });
    const result = retrievalFrequency([t1, t2], 10);
    assert.equal(result[0].count, 10);
    assert.equal(result[1].count, 1);
  });
});

describe('inclusionFrequency', () => {
  test('computes rate as inclusionCount/totalCases', () => {
    const t = makeTemplate({ tracking: { ...makeTemplate().tracking, inclusionCount: 4 } });
    const result = inclusionFrequency([t], 8);
    assert.equal(result[0].rate, 0.5);
  });
});

// ─── approvalRate ─────────────────────────────────────────────────────────────

describe('approvalRate', () => {
  test('approvalRate = approvalCount / (approvalCount + editCount)', () => {
    const t = makeTemplate({
      tracking: { ...makeTemplate().tracking, approvalCount: 3, editCount: 1 },
    });
    const result = approvalRate([t]);
    assert.equal(result[0].approvalRate, 0.75);
  });

  test('approvalRate = null when no reviews yet', () => {
    const t = makeTemplate({
      tracking: { ...makeTemplate().tracking, approvalCount: 0, editCount: 0 },
    });
    const result = approvalRate([t]);
    assert.equal(result[0].approvalRate, null);
  });

  test('editRate = editCount / approvalCount', () => {
    const t = makeTemplate({
      tracking: { ...makeTemplate().tracking, approvalCount: 4, editCount: 2 },
    });
    const result = approvalRate([t]);
    assert.equal(result[0].editRate, 0.5);
  });
});

// ─── staleRate ────────────────────────────────────────────────────────────────

describe('staleRate', () => {
  test('counts stale templates correctly', () => {
    const stale = makeTemplate({ tracking: { ...makeTemplate().tracking, staleAt: '2025-01-01T00:00:00Z' } });
    const fresh = makeTemplate();
    const result = staleRate([stale, fresh]);
    assert.equal(result.staleCount, 1);
    assert.equal(result.staleRate, 0.5);
  });

  test('returns staleRate=0 with no templates', () => {
    assert.equal(staleRate([]).staleRate, 0);
  });
});

// ─── templateSummary ──────────────────────────────────────────────────────────

describe('templateSummary', () => {
  test('includes all key fields per template', () => {
    const t = makeTemplate();
    const result = templateSummary([t], 10);
    assert.equal(result[0].templateId, t.id);
    assert.ok('retrievalRate' in result[0]);
    assert.ok('inclusionRate' in result[0]);
    assert.ok('approvalRate' in result[0]);
    assert.ok('editRate' in result[0]);
    assert.ok('isStale' in result[0]);
    assert.ok('knowledgeSourceCount' in result[0]);
  });

  test('rates are null when totalCases=0', () => {
    const t = makeTemplate();
    const result = templateSummary([t], 0);
    assert.equal(result[0].retrievalRate, null);
    assert.equal(result[0].inclusionRate, null);
  });
});

// ─── incrementTracking ────────────────────────────────────────────────────────

describe('incrementTracking', () => {
  test('increments the specified counter by 1', () => {
    const t = makeTemplate();
    const updated = incrementTracking(t, 'retrievalCount');
    assert.equal(updated.tracking.retrievalCount, t.tracking.retrievalCount + 1);
  });

  test('increments by custom amount', () => {
    const t = makeTemplate();
    const updated = incrementTracking(t, 'usefulnessSignals', 3);
    assert.equal(updated.tracking.usefulnessSignals, t.tracking.usefulnessSignals + 3);
  });

  test('does not mutate the original template', () => {
    const t = makeTemplate();
    const original = t.tracking.retrievalCount;
    incrementTracking(t, 'retrievalCount');
    assert.equal(t.tracking.retrievalCount, original);
  });
});

// ─── markTemplateStale ────────────────────────────────────────────────────────

describe('markTemplateStale', () => {
  test('sets staleAt to now', () => {
    const t = makeTemplate();
    assert.equal(t.tracking.staleAt, null);
    const before = new Date();
    const updated = markTemplateStale(t);
    const after = new Date();
    assert.ok(updated.tracking.staleAt !== null);
    const staleDate = new Date(updated.tracking.staleAt);
    assert.ok(staleDate >= before && staleDate <= after);
  });
});

// ─── promoteKnowledgeItem ─────────────────────────────────────────────────────

describe('promoteKnowledgeItem', () => {
  test('advances promotionState one step', () => {
    const item = makeKnowledgeItem({ promotionState: 'case_only' });
    saveKnowledgeItem(item);
    const { item: promoted } = promoteKnowledgeItem(item, {
      promotedBy: 'admin_operator',
      scope: 'global',
      sourceCaseIds: ['case-001'],
    });
    assert.equal(promoted.promotionState, 'candidate_pattern');
  });

  test('advances through all states in order', () => {
    const states = ['case_only', 'candidate_pattern', 'validated', 'rule_update_candidate'];
    let item = makeKnowledgeItem({ promotionState: 'case_only' });
    saveKnowledgeItem(item);

    for (let i = 0; i < states.length - 1; i++) {
      const { item: next } = promoteKnowledgeItem(item, {
        promotedBy: 'system_owner',
        scope: 'global',
        sourceCaseIds: ['c-001'],
      });
      assert.equal(next.promotionState, states[i + 1]);
      item = next;
      saveKnowledgeItem(item);
    }
  });

  test('throws when already at maximum state', () => {
    const item = makeKnowledgeItem({ promotionState: 'rule_update_candidate' });
    saveKnowledgeItem(item);
    assert.throws(
      () => promoteKnowledgeItem(item, { promotedBy: 'admin', scope: 'global', sourceCaseIds: ['c-001'] }),
      /already at maximum/
    );
  });

  test('writes audit log with fromState and toState', () => {
    const item = makeKnowledgeItem({ promotionState: 'case_only' });
    saveKnowledgeItem(item);
    const { log } = promoteKnowledgeItem(item, {
      promotedBy: 'system_owner',
      scope: 'campaign',
      sourceCaseIds: ['c-123'],
      notes: 'Validated by clinical team',
    });
    assert.equal(log.action, 'knowledge_item_promoted');
    assert.equal(log.diff.fromState, 'case_only');
    assert.equal(log.diff.toState, 'candidate_pattern');
    assert.equal(log.diff.scope, 'campaign');
    assert.deepEqual(log.diff.sourceCaseIds, ['c-123']);
  });

  test('record includes all metadata fields', () => {
    const item = makeKnowledgeItem({ promotionState: 'case_only' });
    saveKnowledgeItem(item);
    const { record } = promoteKnowledgeItem(item, {
      promotedBy: 'admin_operator',
      scope: 'segment',
      sourceCaseIds: ['c-001', 'c-002'],
      notes: 'Pattern validated',
    });
    assert.equal(record.itemId, item.id);
    assert.equal(record.fromState, 'case_only');
    assert.equal(record.toState, 'candidate_pattern');
    assert.deepEqual(record.sourceCaseIds, ['c-001', 'c-002']);
    assert.equal(record.notes, 'Pattern validated');
  });
});

// ─── deIdentifyForPromotion ───────────────────────────────────────────────────

describe('deIdentifyForPromotion', () => {
  test('redacts user/case ID patterns', () => {
    const { cleaned, flagged } = deIdentifyForPromotion('Case user-001 reported fatigue');
    assert.ok(!cleaned.includes('user-001'));
    assert.ok(cleaned.includes('[ID_REDACTED]'));
    assert.equal(flagged, true);
  });

  test('redacts email addresses', () => {
    const { cleaned } = deIdentifyForPromotion('Contact: john.doe@example.com for details');
    assert.ok(!cleaned.includes('john.doe@example.com'));
    assert.ok(cleaned.includes('[EMAIL_REDACTED]'));
  });

  test('redacts Israeli phone numbers', () => {
    const { cleaned } = deIdentifyForPromotion('Call 050-123-4567 for info');
    assert.ok(!cleaned.includes('050-123-4567'));
    assert.ok(cleaned.includes('[PHONE_REDACTED]'));
  });

  test('redacts Hebrew name patterns', () => {
    const { cleaned } = deIdentifyForPromotion('שם: יוסי עבד עבודה קשה');
    assert.ok(!cleaned.includes('יוסי'));
    assert.ok(cleaned.includes('[REDACTED]'));
  });

  test('flags specific dates as a warning without redacting', () => {
    const { flagged, warnings } = deIdentifyForPromotion('Event occurred on 15/03/2025');
    assert.equal(flagged, true);
    assert.ok(warnings.some(w => w.includes('date')));
  });

  test('returns flagged=false for clean text', () => {
    const { flagged, warnings, cleaned } = deIdentifyForPromotion('Employee reported difficulty with morning routine');
    assert.equal(flagged, false);
    assert.deepEqual(warnings, []);
    assert.equal(cleaned, 'Employee reported difficulty with morning routine');
  });
});

// ─── createFeedback ───────────────────────────────────────────────────────────

describe('createFeedback', () => {
  test('creates feedback with required fields', () => {
    const fb = createFeedback({
      templateId: 'tmpl-001',
      caseId: 'case-001',
      feedbackType: 'usefulness_feedback',
      polarity: 'positive',
      recordedBy: 'admin_operator',
    });
    assert.equal(fb.templateId, 'tmpl-001');
    assert.equal(fb.feedbackType, 'usefulness_feedback');
    assert.equal(fb.polarity, 'positive');
    assert.ok(fb.id);
    assert.ok(fb.recordedAt);
  });

  test('defaults to neutral polarity', () => {
    const fb = createFeedback({ templateId: 'tmpl-001', feedbackType: 'delivery_feedback' });
    assert.equal(fb.polarity, 'neutral');
  });
});
