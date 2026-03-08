/**
 * Tests — Report Renderers (Step 7)
 * Covers all 4 output types: user, employer, anonymous org, lead.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { renderUserReport, createUserReportRevision } from '../../src/reports/userReport.js';
import { renderEmployerReport } from '../../src/reports/employerReport.js';
import { renderAnonymousOrgReport } from '../../src/reports/anonymousReport.js';
import { shouldCreateLead, buildLeadObject, detectAndBuildLead } from '../../src/reports/leadReport.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePipelineResult(overrides = {}) {
  return {
    engines: {
      intake: {
        barrierScores: { sensory_discomfort: 4, authority: 4, concentration: 3 },
        meanScore: 3.7,
        overallSeverity: 'high',
        criticalBarriers: [
          { id: 'sensory_discomfort', he: 'אי נוחות חושית', en: 'Sensory discomfort', score: 4, cluster: 'physiological' },
          { id: 'authority',          he: 'קשיים עם סמכות',  en: 'Authority issues',   score: 4, cluster: 'relational' },
        ],
        clusterScores: { physiological: 4, relational: 4, cognitive: 3 },
        patterns: [
          { id: 'hypervigilance',      he: 'היפרוויגיל',           en: 'Hypervigilance' },
          { id: 'authority_sensitivity', he: 'רגישות לסמכות',        en: 'Authority sensitivity' },
        ],
      },
      interpretation: {
        riskFlags: [{ id: 'burnout_risk', severity: 'medium', he: 'סיכון שחיקה', action_he: '' }],
        investmentPriorities: ['management', 'physical_env'],
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
        summary: { totalAccommodations: 6, zeroCostPercentage: 33 },
      },
      implementation: { applicableModules: [] },
      framing: {
        objections: [{ he: 'התאמות הן הוצאה', response_he: 'רוב ההתאמות הן ללא עלות.' }],
      },
    },
    summary: { overallSeverity: 'high' },
    ...overrides,
  };
}

function makeProfile(overrides = {}) {
  return {
    userId: 'user-abc',
    disclosurePreference: 'partial_contextual',
    employmentContext: {
      employmentStage: 'active_employment',
      workplaceType: 'office',
    },
    ...overrides,
  };
}

// ─── User Report ──────────────────────────────────────────────────────────────

describe('renderUserReport', () => {
  test('returns a ReportObject with correct type and state', () => {
    const pr = makePipelineResult();
    const profile = makeProfile();
    const report = renderUserReport(pr, profile);
    assert.equal(report.reportType, 'user');
    assert.ok(['draft_generated', 'admin_review_required'].includes(report.state));
    assert.equal(report.caseId, 'user-abc');
  });

  test('sections object has all 8 required keys', () => {
    const report = renderUserReport(makePipelineResult(), makeProfile());
    const required = [
      'what_we_understood', 'main_barriers', 'amplifiers',
      'user_recommendations', 'employer_actions', 'conversation_prep',
      'resources', 'what_was_not_shared',
    ];
    for (const key of required) {
      assert.ok(key in report.sections, `Missing section: ${key}`);
    }
  });

  test('what_we_understood is a non-empty Hebrew string', () => {
    const report = renderUserReport(makePipelineResult(), makeProfile());
    assert.ok(typeof report.sections.what_we_understood === 'string');
    assert.ok(report.sections.what_we_understood.length > 10);
  });

  test('main_barriers is an array with barrier descriptions', () => {
    const report = renderUserReport(makePipelineResult(), makeProfile());
    assert.ok(Array.isArray(report.sections.main_barriers));
    assert.ok(report.sections.main_barriers.length >= 1);
    assert.ok(report.sections.main_barriers[0].includes('אי נוחות חושית'));
  });

  test('resources section includes at least 2 entries', () => {
    const report = renderUserReport(makePipelineResult(), makeProfile());
    assert.ok(Array.isArray(report.sections.resources));
    assert.ok(report.sections.resources.length >= 2);
  });

  test('what_was_not_shared explains sharing status', () => {
    const report = renderUserReport(makePipelineResult(), makeProfile(), { employerReportGenerated: true });
    assert.ok(typeof report.sections.what_was_not_shared === 'string');
    assert.ok(report.sections.what_was_not_shared.length > 5);
  });

  test('no_disclosure profile: employer_actions shows blocked message', () => {
    const profile = makeProfile({ disclosurePreference: 'no_disclosure' });
    const report = renderUserReport(makePipelineResult(), profile);
    const emp = report.sections.employer_actions;
    assert.ok(Array.isArray(emp));
    assert.ok(emp[0].includes('לא שותפו'));
  });

  test('metadata includes recommendation summary', () => {
    const report = renderUserReport(makePipelineResult(), makeProfile());
    assert.ok(report.metadata?.recommendationSummary);
    assert.ok(typeof report.metadata.candidateCount === 'number');
  });
});

describe('createUserReportRevision', () => {
  test('creates new report with incremented version', () => {
    const original = renderUserReport(makePipelineResult(), makeProfile());
    original.version = '1.0.0';
    const originalId = original.id;
    const revision = createUserReportRevision(
      original,
      { what_we_understood: 'Updated summary.' },
      'correction'
    );
    assert.equal(revision.version, '1.1.0');
    assert.equal(revision.previousVersionId, originalId);
    assert.equal(revision.reportType, 'user');
  });

  test('revision is always in admin_review_required state', () => {
    const original = renderUserReport(makePipelineResult(), makeProfile());
    original.version = '2.3.0';
    const revision = createUserReportRevision(original, {}, 'clarification');
    assert.equal(revision.state, 'admin_review_required');
    assert.equal(revision.version, '2.4.0');
  });

  test('updated sections override original; other sections preserved', () => {
    const original = renderUserReport(makePipelineResult(), makeProfile());
    original.version = '1.0.0';
    const revision = createUserReportRevision(
      original,
      { what_we_understood: 'New intro.' },
      'clarification'
    );
    assert.equal(revision.sections.what_we_understood, 'New intro.');
    // Resources should be preserved from original
    assert.deepEqual(revision.sections.resources, original.sections.resources);
  });
});

// ─── Employer Report ──────────────────────────────────────────────────────────

describe('renderEmployerReport', () => {
  test('throws for no_disclosure profile', () => {
    const pr = makePipelineResult();
    const profile = makeProfile({ disclosurePreference: 'no_disclosure' });
    assert.throws(() => renderEmployerReport(pr, profile), /blocked/);
  });

  test('returns a ReportObject with reportType employer', () => {
    const pr = makePipelineResult();
    const profile = makeProfile({ disclosurePreference: 'partial_contextual' });
    const report = renderEmployerReport(pr, profile);
    assert.equal(report.reportType, 'employer');
  });

  test('is always in admin_review_required state (mandatory human approval)', () => {
    const pr = makePipelineResult();
    const profile = makeProfile({ disclosurePreference: 'functional_only' });
    const report = renderEmployerReport(pr, profile);
    assert.equal(report.state, 'admin_review_required');
  });

  test('has all 8 required sections', () => {
    const pr = makePipelineResult();
    const profile = makeProfile({ disclosurePreference: 'partial_contextual' });
    const report = renderEmployerReport(pr, profile);
    const required = [
      'purpose', 'work_impact_summary', 'key_barriers',
      'top_adjustments', 'what_communication_helps', 'what_to_avoid',
      'implementation_priority', 'lecture_note',
    ];
    for (const key of required) {
      assert.ok(key in report.sections, `Missing section: ${key}`);
    }
  });

  test('purpose section is a non-empty string', () => {
    const report = renderEmployerReport(makePipelineResult(), makeProfile({ disclosurePreference: 'functional_only' }));
    assert.ok(typeof report.sections.purpose === 'string');
    assert.ok(report.sections.purpose.length > 20);
  });

  test('what_to_avoid is an array of strings', () => {
    const report = renderEmployerReport(makePipelineResult(), makeProfile({ disclosurePreference: 'functional_only' }));
    assert.ok(Array.isArray(report.sections.what_to_avoid));
    assert.ok(report.sections.what_to_avoid.length >= 3);
  });

  test('implementation_priority has immediate/near_term/longer_term keys', () => {
    const report = renderEmployerReport(makePipelineResult(), makeProfile({ disclosurePreference: 'partial_contextual' }));
    const pri = report.sections.implementation_priority;
    assert.ok('immediate' in pri);
    assert.ok('near_term' in pri);
    assert.ok('longer_term' in pri);
  });

  test('delivery channel is admin_manual', () => {
    const report = renderEmployerReport(makePipelineResult(), makeProfile({ disclosurePreference: 'functional_only' }));
    assert.equal(report.deliveryChannel, 'admin_manual');
  });
});

// ─── Anonymous Org Report ─────────────────────────────────────────────────────

describe('renderAnonymousOrgReport', () => {
  test('returns reportType anonymous_org', () => {
    const pr = makePipelineResult();
    const report = renderAnonymousOrgReport(pr, null);
    assert.equal(report.reportType, 'anonymous_org');
  });

  test('is always in admin_review_required state', () => {
    const report = renderAnonymousOrgReport(makePipelineResult(), null);
    assert.equal(report.state, 'admin_review_required');
  });

  test('disclosure level is always no_disclosure (no PII)', () => {
    const report = renderAnonymousOrgReport(makePipelineResult(), makeProfile());
    assert.equal(report.disclosureLevel, 'no_disclosure');
  });

  test('has all 6 required sections', () => {
    const report = renderAnonymousOrgReport(makePipelineResult(), null);
    const required = [
      'why_org_receives_this', 'general_barrier_indication',
      'common_patterns', 'org_level_actions',
      'lecture_invitation', 'no_identifying_info',
    ];
    for (const key of required) {
      assert.ok(key in report.sections, `Missing section: ${key}`);
    }
  });

  test('no_identifying_info section is present and non-empty', () => {
    const report = renderAnonymousOrgReport(makePipelineResult(), null);
    assert.ok(typeof report.sections.no_identifying_info === 'string');
    assert.ok(report.sections.no_identifying_info.length > 20);
  });

  test('lecture_invitation is null when hasLectureOpportunity is false', () => {
    const report = renderAnonymousOrgReport(makePipelineResult(), null, { hasLectureOpportunity: false });
    assert.equal(report.sections.lecture_invitation, null);
  });

  test('lecture_invitation is present for high-severity case', () => {
    const report = renderAnonymousOrgReport(makePipelineResult(), null);
    assert.ok(typeof report.sections.lecture_invitation === 'string');
  });

  test('orgName stored in metadata', () => {
    const report = renderAnonymousOrgReport(makePipelineResult(), null, { orgName: 'Acme Corp' });
    assert.equal(report.metadata.orgName, 'Acme Corp');
  });

  test('safe for no_disclosure profile — no individual data', () => {
    const profile = makeProfile({ disclosurePreference: 'no_disclosure' });
    // Should NOT throw — anonymous report is always safe
    const report = renderAnonymousOrgReport(makePipelineResult(), profile);
    assert.equal(report.reportType, 'anonymous_org');
  });
});

// ─── Lead Object ──────────────────────────────────────────────────────────────

describe('shouldCreateLead', () => {
  test('returns true for high-severity case with org-relevant patterns', () => {
    const pr = makePipelineResult();
    assert.equal(shouldCreateLead(pr), true);
  });

  test('returns false for low-severity case', () => {
    const pr = makePipelineResult({
      summary: { overallSeverity: 'low' },
      engines: {
        ...makePipelineResult().engines,
        intake: { ...makePipelineResult().engines.intake, overallSeverity: 'low' },
      },
    });
    assert.equal(shouldCreateLead(pr), false);
  });

  test('returns false for high-severity case without org-relevant patterns', () => {
    const pr = makePipelineResult();
    pr.engines.intake.patterns = [{ id: 'sleep_issues', he: 'בעיות שינה', en: 'Sleep issues' }];
    assert.equal(shouldCreateLead(pr), false);
  });
});

describe('buildLeadObject', () => {
  test('returns an object with required lead fields', () => {
    const pr = makePipelineResult();
    const profile = makeProfile();
    const lead = buildLeadObject(pr, profile, { orgName: 'Test Org', orgType: 'private' });
    assert.ok(lead.id);
    assert.equal(lead.caseId, 'user-abc');
    assert.equal(lead.orgName, 'Test Org');
    assert.equal(lead.orgType, 'private');
    assert.equal(lead.exportState, 'detected');
    assert.ok(lead.recommendedLectureAngle);
    assert.ok(lead.lectureOpportunityReason);
    assert.ok(lead.safeContextNotes);
  });

  test('consentStatus defaults to pending', () => {
    const lead = buildLeadObject(makePipelineResult(), makeProfile());
    assert.equal(lead.consentStatus, 'pending');
  });

  test('sourceSignalType is set', () => {
    const lead = buildLeadObject(makePipelineResult(), makeProfile());
    assert.ok(lead.sourceSignalType);
  });
});

describe('detectAndBuildLead', () => {
  test('returns lead for qualifying case', () => {
    const lead = detectAndBuildLead(makePipelineResult(), makeProfile());
    assert.ok(lead !== null);
    assert.equal(lead.exportState, 'detected');
  });

  test('returns null for non-qualifying case (low severity)', () => {
    const pr = makePipelineResult({ summary: { overallSeverity: 'low' } });
    pr.engines.intake.overallSeverity = 'low';
    const lead = detectAndBuildLead(pr, makeProfile());
    assert.equal(lead, null);
  });
});
