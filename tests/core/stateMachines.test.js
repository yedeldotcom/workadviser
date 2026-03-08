/**
 * Tests for core state machines (Step 2).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  INTERVIEW_STATES,
  isValidTransition as isValidInterviewTransition,
  transitionInterview,
} from '../../src/core/state/interviewState.js';

import {
  RELEASE_STATES,
  isValidReleaseTransition,
  transitionRelease,
} from '../../src/core/state/releaseState.js';

import {
  RECOMMENDATION_STATES,
  isValidRecommendationTransition,
  transitionRecommendation,
} from '../../src/core/state/recommendationLifecycle.js';

import {
  LEAD_STATES,
  isValidLeadTransition,
  transitionLead,
} from '../../src/core/state/leadHandoffState.js';

import {
  REVIEW_STATES,
  isValidReviewTransition,
  transitionReview,
} from '../../src/core/state/reviewApprovalState.js';

import { createInterviewSession } from '../../src/core/models/interviewSession.js';
import { createReport } from '../../src/core/models/report.js';
import { createRecommendationTemplate } from '../../src/core/models/recommendation.js';
import { createLead } from '../../src/core/models/report.js';

// ─── InterviewState ───────────────────────────────────────────────────────────

describe('InterviewStateMachine', () => {
  it('allows valid transitions', () => {
    assert.ok(isValidInterviewTransition('not_started', 'onboarding'));
    assert.ok(isValidInterviewTransition('onboarding', 'active'));
    assert.ok(isValidInterviewTransition('active', 'paused'));
    assert.ok(isValidInterviewTransition('active', 'distress_hold'));
    assert.ok(isValidInterviewTransition('active', 'complete'));
    assert.ok(isValidInterviewTransition('paused', 'active'));
  });

  it('rejects invalid transitions', () => {
    assert.equal(isValidInterviewTransition('complete', 'active'), false);
    assert.equal(isValidInterviewTransition('not_started', 'active'), false);
    assert.equal(isValidInterviewTransition('dropped_silent', 'onboarding'), false);
  });

  it('transitionInterview updates state and timestamps', () => {
    const session = createInterviewSession({ state: 'onboarding' });
    const updated = transitionInterview(session, 'active');
    assert.equal(updated.state, 'active');
    assert.ok(updated.lastActiveAt);
  });

  it('transitionInterview sets completedAt on complete', () => {
    const session = createInterviewSession({ state: 'active' });
    const updated = transitionInterview(session, 'complete');
    assert.equal(updated.state, 'complete');
    assert.ok(updated.completedAt);
  });

  it('transitionInterview records dropoutType', () => {
    const session = createInterviewSession({ state: 'active' });
    const updated = transitionInterview(session, 'dropped_distress', { dropoutType: 'distress' });
    assert.equal(updated.dropoutType, 'distress');
  });

  it('throws on invalid transition', () => {
    const session = createInterviewSession({ state: 'complete' });
    assert.throws(() => transitionInterview(session, 'active'), /Invalid interview transition/);
  });
});

// ─── ReleaseState ─────────────────────────────────────────────────────────────

describe('ReleaseStateMachine', () => {
  it('allows full happy path', () => {
    const states = [
      'draft_generated',
      'admin_review_required',
      'admin_approved',
      'user_delivery_ready',
      'delivered_to_user',
      'user_viewed',
      'user_approved_for_employer',
      'employer_delivery_ready',
      'sent_to_employer',
      'employer_viewed',
      'archived',
    ];
    for (let i = 0; i < states.length - 1; i++) {
      assert.ok(
        isValidReleaseTransition(states[i], states[i + 1]),
        `Expected valid: ${states[i]} → ${states[i + 1]}`
      );
    }
  });

  it('rejects backwards transitions', () => {
    assert.equal(isValidReleaseTransition('employer_viewed', 'draft_generated'), false);
    assert.equal(isValidReleaseTransition('archived', 'admin_approved'), false);
  });

  it('transitionRelease stamps adminReviewedAt', () => {
    const report = createReport({ state: 'admin_review_required' });
    const updated = transitionRelease(report, 'admin_approved');
    assert.equal(updated.state, 'admin_approved');
    assert.ok(updated.adminReviewedAt);
  });

  it('transitionRelease stamps deliveredAt', () => {
    const report = createReport({ state: 'user_delivery_ready' });
    const updated = transitionRelease(report, 'delivered_to_user');
    assert.ok(updated.deliveredAt);
  });

  it('throws on invalid transition', () => {
    const report = createReport({ state: 'archived' });
    assert.throws(() => transitionRelease(report, 'draft_generated'), /Invalid release transition/);
  });
});

// ─── RecommendationLifecycle ──────────────────────────────────────────────────

describe('RecommendationLifecycleMachine', () => {
  it('allows draft → active', () => {
    assert.ok(isValidRecommendationTransition('draft', 'active'));
  });

  it('allows active → deprecated → archived', () => {
    assert.ok(isValidRecommendationTransition('active', 'deprecated'));
    assert.ok(isValidRecommendationTransition('deprecated', 'archived'));
  });

  it('rejects archived → active', () => {
    assert.equal(isValidRecommendationTransition('archived', 'active'), false);
  });

  it('transitions template lifecycleState', () => {
    const tmpl = createRecommendationTemplate({ lifecycleState: 'draft' });
    const updated = transitionRecommendation(tmpl, 'active');
    assert.equal(updated.lifecycleState, 'active');
  });

  it('throws on invalid transition', () => {
    const tmpl = createRecommendationTemplate({ lifecycleState: 'archived' });
    assert.throws(() => transitionRecommendation(tmpl, 'active'), /Invalid recommendation lifecycle/);
  });
});

// ─── LeadHandoffState ─────────────────────────────────────────────────────────

describe('LeadHandoffStateMachine', () => {
  it('allows full export path', () => {
    assert.ok(isValidLeadTransition('detected', 'lead_created'));
    assert.ok(isValidLeadTransition('lead_created', 'ready_for_export'));
    assert.ok(isValidLeadTransition('ready_for_export', 'exported'));
    assert.ok(isValidLeadTransition('exported', 'archived'));
  });

  it('allows retry on failure', () => {
    assert.ok(isValidLeadTransition('failed', 'ready_for_export'));
  });

  it('transitionLead stamps exportTimestamp', () => {
    const lead = createLead({ exportState: 'ready_for_export' });
    const updated = transitionLead(lead, 'exported', { exportTarget: 'CRM-A' });
    assert.equal(updated.exportState, 'exported');
    assert.ok(updated.exportTimestamp);
    assert.equal(updated.exportTarget, 'CRM-A');
  });

  it('throws on invalid transition', () => {
    const lead = createLead({ exportState: 'archived' });
    assert.throws(() => transitionLead(lead, 'exported'), /Invalid lead transition/);
  });
});

// ─── ReviewApprovalState ──────────────────────────────────────────────────────

describe('ReviewApprovalStateMachine', () => {
  it('allows pending → in_review → approved', () => {
    assert.ok(isValidReviewTransition('pending', 'in_review'));
    assert.ok(isValidReviewTransition('in_review', 'approved'));
  });

  it('allows rejected to be re-reviewed', () => {
    assert.ok(isValidReviewTransition('rejected', 'in_review'));
  });

  it('rejects approved → pending', () => {
    assert.equal(isValidReviewTransition('approved', 'pending'), false);
  });

  it('transitionReview updates state', () => {
    const item = { state: 'pending' };
    const updated = transitionReview(item, 'in_review', { assignedTo: 'admin-1' });
    assert.equal(updated.state, 'in_review');
    assert.equal(updated.assignedTo, 'admin-1');
  });

  it('throws on invalid transition', () => {
    const item = { state: 'approved' };
    assert.throws(() => transitionReview(item, 'pending'), /Invalid review transition/);
  });
});
