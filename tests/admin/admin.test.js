/**
 * Tests for the admin system (Step 5).
 * Tests the logic layer directly (store, queues, caseView, actions, permissions).
 * HTTP layer is smoke-tested at the end.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  resetStore, saveUser, saveProfile, saveSession, saveReport, saveLead,
  getReport, getProfile, getAllAuditLogs, getStoreCounts,
} from '../../src/admin/store.js';

import { createUser } from '../../src/core/models/user.js';
import { createUserProfile } from '../../src/core/models/userProfile.js';
import { createInterviewSession } from '../../src/core/models/interviewSession.js';
import { createReport, createLead } from '../../src/core/models/report.js';

import {
  getNewUsersQueue, getActiveCasesQueue,
  getReviewRequiredQueue, getLeadsReadyQueue, getQueueSummary,
} from '../../src/admin/queues.js';

import { buildCaseWorkspace, buildLogicMap } from '../../src/admin/caseView.js';

import {
  approveReport, rejectReport, editRecommendation,
  addCaseNote, markFollowUp, markReportReadyForDelivery,
} from '../../src/admin/actions.js';

import {
  ROLES, can, canAccessCase,
} from '../../src/admin/permissions.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return createUser({ channel: 'whatsapp', consentState: 'given', ...overrides });
}

function makeSession(userId, state = 'active', overrides = {}) {
  return createInterviewSession({ userId, state, ...overrides });
}

function makeReport(caseId, state = 'draft_generated', type = 'user') {
  return createReport({ caseId, reportType: type, state });
}

// ─── Store ────────────────────────────────────────────────────────────────────

describe('Store', () => {
  beforeEach(() => resetStore());

  it('saves and retrieves objects', () => {
    const user = makeUser();
    saveUser(user);
    const stored = getStoreCounts();
    assert.equal(stored.users, 1);
  });

  it('getStoreCounts reflects all saves', () => {
    saveUser(makeUser());
    saveUser(makeUser());
    assert.equal(getStoreCounts().users, 2);
  });

  it('resetStore clears everything', () => {
    saveUser(makeUser());
    resetStore();
    assert.equal(getStoreCounts().users, 0);
  });
});

// ─── Queues ───────────────────────────────────────────────────────────────────

describe('getNewUsersQueue', () => {
  beforeEach(() => resetStore());

  it('returns users with no sessions', () => {
    const u1 = makeUser();
    const u2 = makeUser();
    saveUser(u1); saveUser(u2);
    const s1 = makeSession(u1.id);
    saveSession(s1);

    const queue = getNewUsersQueue([u1, u2], [s1]);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].userId, u2.id);
  });

  it('returns empty when all users have sessions', () => {
    const u = makeUser();
    const s = makeSession(u.id);
    assert.equal(getNewUsersQueue([u], [s]).length, 0);
  });

  it('sorts newest first', () => {
    const u1 = makeUser({ createdAt: '2026-01-01T00:00:00.000Z' });
    const u2 = makeUser({ createdAt: '2026-02-01T00:00:00.000Z' });
    const queue = getNewUsersQueue([u1, u2], []);
    assert.equal(queue[0].userId, u2.id); // newest first
  });
});

describe('getActiveCasesQueue', () => {
  beforeEach(() => resetStore());

  it('includes onboarding, active, paused, distress_hold sessions', () => {
    const u = makeUser();
    const s1 = makeSession(u.id, 'active');
    const s2 = makeSession(u.id, 'paused');
    const s3 = makeSession(u.id, 'complete');
    const s4 = makeSession(u.id, 'distress_hold');

    const queue = getActiveCasesQueue([s1, s2, s3, s4], [u]);
    assert.equal(queue.length, 3);
    assert.ok(queue.every(q => q.state !== 'complete'));
  });

  it('puts distress_hold first', () => {
    const u = makeUser();
    const s1 = makeSession(u.id, 'active',       { lastActiveAt: '2026-02-01T00:00:00.000Z' });
    const s2 = makeSession(u.id, 'distress_hold', { lastActiveAt: '2026-01-01T00:00:00.000Z' });

    const queue = getActiveCasesQueue([s1, s2], [u]);
    assert.equal(queue[0].state, 'distress_hold');
  });
});

describe('getReviewRequiredQueue', () => {
  beforeEach(() => resetStore());

  it('returns draft_generated and admin_review_required reports', () => {
    const u = makeUser();
    const r1 = makeReport(u.id, 'draft_generated');
    const r2 = makeReport(u.id, 'admin_review_required');
    const r3 = makeReport(u.id, 'admin_approved');

    const queue = getReviewRequiredQueue([r1, r2, r3], [u]);
    assert.equal(queue.length, 2);
    assert.ok(queue.every(r => r.state !== 'admin_approved'));
  });

  it('sorts oldest first (FIFO review)', () => {
    const u = makeUser();
    const r1 = makeReport(u.id, 'draft_generated');
    r1.generatedAt = '2026-02-01T00:00:00.000Z';
    const r2 = makeReport(u.id, 'draft_generated');
    r2.generatedAt = '2026-01-01T00:00:00.000Z';

    const queue = getReviewRequiredQueue([r1, r2], [u]);
    assert.ok(new Date(queue[0].generatedAt) <= new Date(queue[1].generatedAt));
  });
});

describe('getLeadsReadyQueue', () => {
  it('returns only ready_for_export leads', () => {
    const l1 = createLead({ exportState: 'ready_for_export' });
    const l2 = createLead({ exportState: 'detected' });
    const l3 = createLead({ exportState: 'exported' });

    const queue = getLeadsReadyQueue([l1, l2, l3]);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].leadId, l1.id);
  });
});

describe('getQueueSummary', () => {
  beforeEach(() => resetStore());

  it('returns counts for all queues', () => {
    const u = makeUser();
    const r = makeReport(u.id, 'draft_generated');
    const summary = getQueueSummary({ users: [u], sessions: [], reports: [r], leads: [] });
    assert.equal(summary.newUsers, 1);
    assert.equal(summary.reviewRequired, 1);
    assert.ok(summary.updatedAt);
  });
});

// ─── Case workspace ───────────────────────────────────────────────────────────

describe('buildCaseWorkspace', () => {
  beforeEach(() => resetStore());

  it('returns null for unknown userId', () => {
    assert.equal(buildCaseWorkspace('nonexistent'), null);
  });

  it('builds workspace for a basic case', () => {
    const user = makeUser();
    const profile = createUserProfile({ userId: user.id });
    const session = makeSession(user.id, 'complete');
    const report = makeReport(user.id, 'draft_generated');

    saveUser(user);
    saveProfile(profile);
    saveSession(session);
    saveReport(report);

    const ws = buildCaseWorkspace(user.id);
    assert.ok(ws);
    assert.equal(ws.caseId, user.id);
    assert.ok(ws.user);
    assert.ok(ws.profile);
    assert.equal(ws.sessions.length, 1);
    assert.equal(ws.reports.length, 1);
    assert.ok(ws.summary);
  });

  it('omits phoneNumber from sanitized user', () => {
    const user = makeUser({ phoneNumber: '+972501234567' });
    saveUser(user);
    const ws = buildCaseWorkspace(user.id);
    assert.equal(ws.user.phoneNumber, undefined);
  });

  it('summary reflects correct state', () => {
    const user = makeUser();
    const session = makeSession(user.id, 'paused', {
      detectedBarrierIds: ['fatigue', 'concentration', 'anxiety_attacks'],
    });
    saveUser(user);
    saveSession(session);

    const ws = buildCaseWorkspace(user.id);
    assert.equal(ws.summary.currentSessionState, 'paused');
    assert.equal(ws.summary.barriersCaptured, 3);
  });
});

describe('buildLogicMap', () => {
  it('builds a logic map from pipeline result', () => {
    // Minimal mock pipeline result
    const pipelineResult = {
      engines: {
        intake: {
          barrierScores: { fatigue: 4 },
          meanScore: 3.5,
          overallSeverity: { he: 'גבוה', en: 'high' },
          criticalBarriers: [{ id: 'fatigue', he: 'עייפות', en: 'Fatigue', score: 4 }],
          patterns: [{ id: 'p1', he: 'עומס', en: 'overload' }],
          clusterScores: {},
        },
        interpretation: {
          riskFlags: [],
          investmentPriorities: [],
          trajectory: null,
        },
        translation: {
          summary: { totalAccommodations: 5, zeroCostPercentage: 60 },
          recommendations: [],
        },
        implementation: {
          applicableModules: [],
        },
      },
      summary: { overallSeverity: { he: 'גבוה' } },
    };

    const map = buildLogicMap(pipelineResult);
    assert.ok(map.input);
    assert.ok(map.detection);
    assert.ok(map.interpretation);
    assert.ok(map.appliedPatterns);
    assert.ok(map.output);
    assert.equal(map.detection.criticalBarriers[0].id, 'fatigue');
    assert.equal(map.appliedPatterns.totalAccommodations, 5);
  });
});

// ─── Actions ──────────────────────────────────────────────────────────────────

describe('approveReport', () => {
  beforeEach(() => resetStore());

  it('transitions report to admin_approved', () => {
    const user = makeUser();
    const report = makeReport(user.id, 'admin_review_required');
    saveUser(user);
    saveReport(report);
    saveProfile(createUserProfile({ userId: user.id }));

    const { report: updated, approval, log } = approveReport(report.id, 'admin-1', 'looks good');
    assert.equal(updated.state, 'admin_approved');
    assert.ok(updated.adminReviewedAt);
    assert.equal(approval.decision, 'approved');
    assert.equal(log.action, 'approved');
    assert.equal(log.changedBy, 'admin-1');
  });

  it('throws for unknown report', () => {
    assert.throws(() => approveReport('nonexistent', 'admin-1'), /Report not found/);
  });
});

describe('rejectReport', () => {
  beforeEach(() => resetStore());

  it('transitions report to withheld', () => {
    const user = makeUser();
    const report = makeReport(user.id, 'admin_review_required');
    saveUser(user);
    saveReport(report);

    const { report: updated, approval } = rejectReport(report.id, 'admin-1', 'needs revision');
    assert.equal(updated.state, 'withheld');
    assert.equal(approval.decision, 'rejected');
  });

  it('requires rejection reason', () => {
    assert.throws(() => rejectReport('r-1', 'admin-1', ''), /reason is required/);
  });
});

describe('editRecommendation', () => {
  beforeEach(() => resetStore());

  it('applies edit and logs it', () => {
    const user = makeUser();
    const report = makeReport(user.id, 'admin_review_required');
    report.sections = { recommendations: [{ id: 'rec-1', action_he: 'original text' }] };
    saveUser(user);
    saveReport(report);

    const { report: updated, log } = editRecommendation(
      report.id, 'rec-1', 'updated text', 'admin-1',
      { meaningChanged: false, reason: 'clarity improvement' }
    );

    assert.equal(log.action, 'recommendation_edited');
    assert.equal(log.meaningChanged, false);
    assert.equal(log.scope, 'local');
    assert.equal(updated.sections.recommendations[0].action_he, 'updated text');
    assert.ok(updated.sections.recommendations[0].edited);
  });

  it('logs meaningChanged=true for substantive edits', () => {
    const user = makeUser();
    const report = makeReport(user.id, 'draft_generated');
    report.sections = {};
    saveUser(user);
    saveReport(report);

    const { log } = editRecommendation(report.id, 'rec-x', 'new text', 'admin-1', { meaningChanged: true });
    assert.equal(log.meaningChanged, true);
  });
});

describe('addCaseNote', () => {
  beforeEach(() => resetStore());

  it('appends note to profile and logs it', () => {
    const user = makeUser();
    const profile = createUserProfile({ userId: user.id });
    saveUser(user);
    saveProfile(profile);

    const { profile: updated, log } = addCaseNote(user.id, 'Follow up next week', 'admin-1');
    assert.equal(updated.adminNotes.length, 1);
    assert.equal(updated.adminNotes[0].text, 'Follow up next week');
    assert.equal(log.action, 'note_added');
  });

  it('throws for unknown profile', () => {
    assert.throws(() => addCaseNote('unknown', 'note', 'admin-1'), /Profile not found/);
  });
});

describe('markFollowUp', () => {
  beforeEach(() => resetStore());

  it('marks follow-up with reason and logs it', () => {
    const user = makeUser();
    const profile = createUserProfile({ userId: user.id });
    saveUser(user);
    saveProfile(profile);

    const { profile: updated, log } = markFollowUp(user.id, { reason: 're-check distress', dueAt: '2026-04-01' }, 'admin-1');
    assert.ok(updated.pendingFollowUp);
    assert.equal(updated.pendingFollowUp.reason, 're-check distress');
    assert.equal(updated.pendingFollowUp.dueAt, '2026-04-01');
    assert.equal(log.action, 'followup_marked');
  });
});

describe('markReportReadyForDelivery', () => {
  beforeEach(() => resetStore());

  it('transitions admin_approved → user_delivery_ready', () => {
    const user = makeUser();
    const report = makeReport(user.id, 'admin_approved');
    saveUser(user);
    saveReport(report);

    const { report: updated } = markReportReadyForDelivery(report.id, 'admin-1');
    assert.equal(updated.state, 'user_delivery_ready');
  });
});

// ─── Audit log accumulation ───────────────────────────────────────────────────

describe('Audit log', () => {
  beforeEach(() => resetStore());

  it('accumulates entries across multiple actions', () => {
    const user = makeUser();
    const profile = createUserProfile({ userId: user.id });
    const report = makeReport(user.id, 'admin_review_required');
    saveUser(user);
    saveProfile(profile);
    saveReport(report);

    approveReport(report.id, 'admin-1');
    addCaseNote(user.id, 'note 1', 'admin-1');
    addCaseNote(user.id, 'note 2', 'admin-2');

    const logs = getAllAuditLogs();
    assert.ok(logs.length >= 3);
  });
});

// ─── Permissions ──────────────────────────────────────────────────────────────

describe('Role capabilities', () => {
  it('system_owner can do everything', () => {
    assert.ok(can(ROLES.SYSTEM_OWNER, 'approve_report'));
    assert.ok(can(ROLES.SYSTEM_OWNER, 'manage_permissions'));
    assert.ok(can(ROLES.SYSTEM_OWNER, 'view_raw_messages'));
    assert.ok(can(ROLES.SYSTEM_OWNER, 'export_lead'));
  });

  it('admin_operator can approve but not manage permissions', () => {
    assert.ok(can(ROLES.ADMIN_OPERATOR, 'approve_report'));
    assert.equal(can(ROLES.ADMIN_OPERATOR, 'manage_permissions'), false);
  });

  it('clinical_content_partner cannot approve or export', () => {
    assert.equal(can(ROLES.CLINICAL_CONTENT_PARTNER, 'approve_report'), false);
    assert.equal(can(ROLES.CLINICAL_CONTENT_PARTNER, 'export_lead'), false);
    assert.ok(can(ROLES.CLINICAL_CONTENT_PARTNER, 'edit_recommendation'));
  });

  it('outreach_referral_partner has minimal capabilities', () => {
    assert.ok(can(ROLES.OUTREACH_REFERRAL_PARTNER, 'add_note'));
    assert.ok(can(ROLES.OUTREACH_REFERRAL_PARTNER, 'mark_followup'));
    assert.equal(can(ROLES.OUTREACH_REFERRAL_PARTNER, 'approve_report'), false);
  });

  it('employer_facing_operator can send reports but not approve', () => {
    assert.ok(can(ROLES.EMPLOYER_FACING_OPERATOR, 'send_employer_report'));
    assert.equal(can(ROLES.EMPLOYER_FACING_OPERATOR, 'approve_report'), false);
  });
});

describe('canAccessCase', () => {
  it('system_owner sees all cases regardless of partner', () => {
    const user = makeUser({ partnerSource: 'org-B' });
    assert.ok(canAccessCase(ROLES.SYSTEM_OWNER, 'org-A', user));
    assert.ok(canAccessCase(ROLES.SYSTEM_OWNER, null, user));
  });

  it('partner role sees only their own cases', () => {
    const user = makeUser({ partnerSource: 'org-A' });
    assert.ok(canAccessCase(ROLES.OUTREACH_REFERRAL_PARTNER, 'org-A', user));
    assert.equal(canAccessCase(ROLES.OUTREACH_REFERRAL_PARTNER, 'org-B', user), false);
  });

  it('partner with null partnerOrgId sees all their cases', () => {
    const user = makeUser({ partnerSource: 'org-A' });
    // null partnerOrgId means no restriction
    assert.ok(canAccessCase(ROLES.OUTREACH_REFERRAL_PARTNER, null, user));
  });
});

// ─── HTTP smoke test ──────────────────────────────────────────────────────────

describe('Admin HTTP smoke test', () => {
  it('createAdminApp returns an Express app', async () => {
    const { createAdminApp } = await import('../../src/admin/server.js');
    const app = createAdminApp();
    assert.equal(typeof app, 'function'); // Express app is a function
    assert.equal(typeof app.listen, 'function');
  });
});
