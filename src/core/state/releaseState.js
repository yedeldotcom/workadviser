/**
 * ReleaseStateMachine — FPP §9.2
 *
 * Governs the lifecycle of a ReportObject from draft generation to final delivery.
 *
 * Happy path (user report):
 *   draft_generated → admin_review_required → admin_approved → user_delivery_ready
 *     → delivered_to_user → user_viewed → archived
 *
 * Employer share path (requires user consent):
 *   user_viewed → user_approved_for_employer → employer_delivery_ready
 *     → sent_to_employer → employer_viewed → archived
 *
 * Withhold path (admin or user blocks delivery):
 *   any non-terminal state → withheld → archived
 *
 * Every report must reach either 'archived' or 'withheld' — no silent drops.
 */

import { createAuditLog } from '../models/auditLog.js';
import { appendAuditLog } from '../../admin/base44Store.js';

export const RELEASE_STATES = {
  DRAFT_GENERATED:              'draft_generated',
  ADMIN_REVIEW_REQUIRED:        'admin_review_required',
  ADMIN_APPROVED:               'admin_approved',
  USER_DELIVERY_READY:          'user_delivery_ready',
  DELIVERED_TO_USER:            'delivered_to_user',
  USER_VIEWED:                  'user_viewed',
  USER_APPROVED_FOR_EMPLOYER:   'user_approved_for_employer',
  EMPLOYER_DELIVERY_READY:      'employer_delivery_ready',
  SENT_TO_EMPLOYER:             'sent_to_employer',
  EMPLOYER_VIEWED:              'employer_viewed',
  WITHHELD:                     'withheld',
  ARCHIVED:                     'archived',
};

/**
 * Valid state transitions for report release.
 * @type {Record<string, string[]>}
 */
const TRANSITIONS = {
  draft_generated:            ['admin_review_required', 'admin_approved'],
  admin_review_required:      ['admin_approved', 'withheld'],
  admin_approved:             ['user_delivery_ready'],
  user_delivery_ready:        ['delivered_to_user', 'withheld'],
  delivered_to_user:          ['user_viewed', 'withheld'],
  user_viewed:                ['user_approved_for_employer', 'withheld', 'archived'],
  user_approved_for_employer: ['employer_delivery_ready'],
  employer_delivery_ready:    ['sent_to_employer', 'withheld'],
  sent_to_employer:           ['employer_viewed', 'withheld'],
  employer_viewed:            ['archived'],
  withheld:                   ['archived'],
  archived:                   [],
};

/**
 * Check whether a release state transition is permitted.
 * @param {string} from - Current release state
 * @param {string} to   - Desired next state
 * @returns {boolean}
 */
export function isValidReleaseTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Transition a ReportObject to a new release state.
 * Automatically stamps audit timestamps (adminReviewedAt, userApprovedAt, deliveredAt)
 * when entering the relevant states.
 *
 * @param {import('../models/report.js').ReportObject} report
 * @param {string} toState
 * @param {{ adminReviewedAt?: string, userApprovedAt?: string, deliveredAt?: string }} [opts]
 * @returns {import('../models/report.js').ReportObject}
 * @throws {Error} If the transition is not valid for the report's current state
 */
export function transitionRelease(report, toState, opts = {}) {
  if (!isValidReleaseTransition(report.state, toState)) {
    throw new Error(`Invalid release transition: ${report.state} → ${toState}`);
  }

  const now = new Date().toISOString();
  const updated = { ...report, state: toState };

  if (opts.adminReviewedAt || toState === 'admin_approved') {
    updated.adminReviewedAt = opts.adminReviewedAt ?? now;
  }
  if (opts.userApprovedAt || toState === 'user_approved_for_employer') {
    updated.userApprovedAt = opts.userApprovedAt ?? now;
  }
  if (opts.deliveredAt || toState === 'delivered_to_user' || toState === 'sent_to_employer') {
    updated.deliveredAt = opts.deliveredAt ?? now;
  }

  // FPP §9.6: every release state transition must be logged
  const log = createAuditLog({
    entityType: 'report',
    entityId: report.id ?? 'unknown',
    action: `release_transition:${report.state}→${toState}`,
    changedBy: opts.changedBy ?? 'system',
    diff: { from: report.state, to: toState },
    meaningChanged: false,
    scope: 'local',
    reason: opts.reason ?? `Release state transition: ${report.state} → ${toState}`,
  });
  appendAuditLog(log).catch(console.error);

  return updated;
}
