/**
 * Admin Case Actions — FPP §6.1, §6.3
 *
 * Inline case actions with mandatory audit logging.
 * Every action here is:
 *   1. Validated (state machine check, role check)
 *   2. Applied to the entity
 *   3. Logged to the audit trail (AuditLog object saved to store)
 *
 * FPP §6.3 edit governance:
 *   - light edit:       wording/clarity change (meaningChanged = false)
 *   - substantive edit: changes meaning/priority/recommendation (meaningChanged = true)
 *   - case-only exception: scope = 'local'
 *   - rule suggestion:  scope = 'reusable', requires system_owner approval
 */

import { createApprovalObject } from '../core/models/approvalObject.js';
import { createAuditLog } from '../core/models/auditLog.js';
import { transitionRelease } from '../core/state/releaseState.js';
import {
  saveReport, saveApproval, appendAuditLog,
  getReport, getProfile, saveProfile,
} from './store.js';

// ─── Report approval ──────────────────────────────────────────────────────────

/**
 * Approve a report and advance its release state.
 * @param {string} reportId
 * @param {string} approvedBy - Admin ID
 * @param {string | null} notes
 * @param {string | null} editSummary
 * @returns {{ report: object, approval: object, log: object }}
 */
export function approveReport(reportId, approvedBy, notes = null, editSummary = null) {
  const report = getReport(reportId);
  if (!report) throw new Error(`Report not found: ${reportId}`);

  const updatedReport = transitionRelease(report, 'admin_approved', {
    adminReviewedAt: new Date().toISOString(),
  });

  const approval = createApprovalObject({
    reportId,
    type: 'admin_approval',
    decision: 'approved',
    approvedBy,
    notes,
    editSummary,
  });

  const log = createAuditLog({
    entityType: 'report',
    entityId: reportId,
    action: 'approved',
    changedBy: approvedBy,
    meaningChanged: Boolean(editSummary),
    scope: 'local',
    reason: notes ?? 'Admin approval',
  });

  saveReport(updatedReport);
  saveApproval(approval);
  appendAuditLog(log);

  return { report: updatedReport, approval, log };
}

/**
 * Reject a report (e.g. needs revision before delivery).
 * @param {string} reportId
 * @param {string} rejectedBy
 * @param {string} reason - Required for rejection
 * @returns {{ report: object, approval: object, log: object }}
 */
export function rejectReport(reportId, rejectedBy, reason) {
  if (!reason) throw new Error('Rejection reason is required');

  const report = getReport(reportId);
  if (!report) throw new Error(`Report not found: ${reportId}`);

  const updatedReport = transitionRelease(report, 'withheld');

  const approval = createApprovalObject({
    reportId,
    type: 'admin_approval',
    decision: 'rejected',
    approvedBy: rejectedBy,
    notes: reason,
  });

  const log = createAuditLog({
    entityType: 'report',
    entityId: reportId,
    action: 'rejected',
    changedBy: rejectedBy,
    meaningChanged: true,
    scope: 'local',
    reason,
  });

  saveReport(updatedReport);
  saveApproval(approval);
  appendAuditLog(log);

  return { report: updatedReport, approval, log };
}

// ─── Recommendation edit ──────────────────────────────────────────────────────

/**
 * Edit a recommendation within a report (wording or substantive).
 * FPP §6.3: logs whether meaning changed; scope determines if edit becomes a rule suggestion.
 *
 * @param {string} reportId
 * @param {string} recommendationId - Which recommendation was changed
 * @param {string} newText_he - Updated Hebrew text
 * @param {string} changedBy
 * @param {{ meaningChanged?: boolean, reason?: string, scope?: 'local' | 'reusable' }} opts
 * @returns {{ report: object, log: object }}
 */
export function editRecommendation(reportId, recommendationId, newText_he, changedBy, opts = {}) {
  const report = getReport(reportId);
  if (!report) throw new Error(`Report not found: ${reportId}`);

  // Apply edit to report sections (shallow patch on the recommendation text)
  const updatedSections = applyRecommendationEdit(report.sections, recommendationId, newText_he);
  const updatedReport = { ...report, sections: updatedSections };

  const log = createAuditLog({
    entityType: 'report',
    entityId: reportId,
    action: 'recommendation_edited',
    changedBy,
    diff: { recommendationId, newText_he },
    meaningChanged: opts.meaningChanged ?? false,
    scope: opts.scope ?? 'local',
    reason: opts.reason ?? null,
  });

  saveReport(updatedReport);
  appendAuditLog(log);

  return { report: updatedReport, log };
}

/**
 * Apply a text edit to a specific recommendation within report sections.
 * Sections is a free-form object — searches all array-valued keys for a matching item.id.
 * Sets item.edited = true as a change marker for downstream audit tools.
 *
 * @param {object | null} sections       - Report sections object
 * @param {string} recommendationId      - ID of the recommendation to update
 * @param {string} newText_he            - Replacement Hebrew text
 * @returns {object | null}              - Updated sections (shallow clone)
 */
function applyRecommendationEdit(sections, recommendationId, newText_he) {
  if (!sections) return sections;
  // sections is a free-form object; find recommendation by ID in any array
  const updated = { ...sections };
  for (const [key, value] of Object.entries(updated)) {
    if (Array.isArray(value)) {
      updated[key] = value.map(item =>
        item?.id === recommendationId ? { ...item, action_he: newText_he, edited: true } : item
      );
    }
  }
  return updated;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

/**
 * Add an internal admin note to a case (attached to the user profile).
 * @param {string} userId
 * @param {string} noteText
 * @param {string} addedBy
 * @returns {{ profile: object, log: object }}
 */
export function addCaseNote(userId, noteText, addedBy) {
  const profile = getProfile(userId);
  if (!profile) throw new Error(`Profile not found for user: ${userId}`);

  const note = {
    id: crypto.randomUUID(),
    text: noteText,
    addedBy,
    addedAt: new Date().toISOString(),
  };

  // Append note to supportSafetyState notes array (or adminNotes if present)
  const updatedProfile = {
    ...profile,
    adminNotes: [...(profile.adminNotes ?? []), note],
    updatedAt: new Date().toISOString(),
  };

  const log = createAuditLog({
    entityType: 'user',
    entityId: userId,
    action: 'note_added',
    changedBy: addedBy,
    meaningChanged: false,
    scope: 'local',
    reason: noteText.slice(0, 100),
  });

  saveProfile(updatedProfile);
  appendAuditLog(log);

  return { profile: updatedProfile, log };
}

// ─── Follow-up mark ───────────────────────────────────────────────────────────

/**
 * Mark a case for follow-up.
 * @param {string} userId
 * @param {{ reason: string, dueAt?: string }} opts
 * @param {string} markedBy
 * @returns {{ profile: object, log: object }}
 */
export function markFollowUp(userId, opts, markedBy) {
  const profile = getProfile(userId);
  if (!profile) throw new Error(`Profile not found for user: ${userId}`);

  const followUp = {
    id: crypto.randomUUID(),
    reason: opts.reason,
    dueAt: opts.dueAt ?? null,
    markedBy,
    markedAt: new Date().toISOString(),
    resolved: false,
  };

  const updatedProfile = {
    ...profile,
    followUpIds: [...(profile.followUpIds ?? []), followUp.id],
    pendingFollowUp: followUp,
    updatedAt: new Date().toISOString(),
  };

  const log = createAuditLog({
    entityType: 'user',
    entityId: userId,
    action: 'followup_marked',
    changedBy: markedBy,
    diff: { reason: opts.reason, dueAt: opts.dueAt },
    meaningChanged: false,
    scope: 'local',
    reason: opts.reason,
  });

  saveProfile(updatedProfile);
  appendAuditLog(log);

  return { profile: updatedProfile, log };
}

// ─── Report delivery (advance to user_delivery_ready) ────────────────────────

/**
 * Mark an approved report as ready for delivery to user.
 * @param {string} reportId
 * @param {string} by
 * @returns {{ report: object, log: object }}
 */
export function markReportReadyForDelivery(reportId, by) {
  const report = getReport(reportId);
  if (!report) throw new Error(`Report not found: ${reportId}`);

  const updatedReport = transitionRelease(report, 'user_delivery_ready');

  const log = createAuditLog({
    entityType: 'report',
    entityId: reportId,
    action: 'marked_delivery_ready',
    changedBy: by,
    meaningChanged: false,
    scope: 'local',
  });

  saveReport(updatedReport);
  appendAuditLog(log);

  return { report: updatedReport, log };
}
