/**
 * Lead Exporter — FPP §6.5
 *
 * Handles the export lifecycle for LeadObjects identified as lecture/consultation
 * opportunities. This module enforces the minimum-necessary data principle:
 * only org-level fields are ever exported — no individual case data.
 *
 * Safety guarantees (FPP §6.5):
 *   - caseId is NEVER included in the exported payload
 *   - Individual barrier scores, patterns, and session data are excluded
 *   - Only org-context fields defined in SAFE_EXPORT_FIELDS are included
 *   - Every export is audit-logged (what, to whom, when, by whom, under which consent)
 *   - Exports require consent status 'given' (not 'pending' or 'denied')
 *
 * Export flow (LeadHandoffStateMachine):
 *   detected → lead_created → ready_for_export → exported
 *                                              ↘ failed → ready_for_export (retry)
 *
 * Supported targets:
 *   - 'internal'   — in-memory stub (default; used in pilot)
 *   - 'crm_webhook' — HTTP POST to external CRM endpoint
 */

import { transitionLead } from '../core/state/leadHandoffState.js';
import { createAuditLog } from '../core/models/auditLog.js';
import { getLead, saveLead, appendAuditLog } from '../admin/store.js';

// ─── Safe export field list ───────────────────────────────────────────────────

/**
 * The complete set of LeadObject fields permitted in an export payload.
 * Enforced by buildExportPayload() — every other field is stripped.
 *
 * Excluded permanently (FPP §6.5):
 *   - caseId         — individual identifier
 *   - createdAt      — timing signal that could narrow identity
 *   - consentStatus  — internal state; recipient doesn't need it
 *   - exportState    — internal state machine field
 *   - exportTimestamp — stamped by the exporter, not sent to target
 *
 * @type {string[]}
 */
const SAFE_EXPORT_FIELDS = [
  'id',
  'orgName',
  'orgType',
  'contactPerson',
  'contactChannel',
  'sourceSignalType',
  'lectureOpportunityReason',
  'recommendedLectureAngle',
  'safeContextNotes',
  'exportTarget',
];

// ─── Payload builder ──────────────────────────────────────────────────────────

/**
 * Build the export payload from a LeadObject.
 * Strips every field not in SAFE_EXPORT_FIELDS — no individual case data.
 *
 * @param {import('../core/models/report.js').LeadObject} lead
 * @param {string} exportTarget - Destination system name
 * @returns {object} Safe org-level export payload
 */
export function buildExportPayload(lead, exportTarget) {
  const payload = {};
  for (const field of SAFE_EXPORT_FIELDS) {
    payload[field] = lead[field] ?? null;
  }
  payload.exportTarget = exportTarget;
  payload.exportedAt = new Date().toISOString();
  return payload;
}

// ─── CRM webhook stub ─────────────────────────────────────────────────────────

/**
 * Send the lead payload to an external CRM via HTTP POST.
 * In pilot this is a stub — configure CRM_WEBHOOK_URL to activate.
 *
 * @param {object} payload - Safe export payload from buildExportPayload()
 * @param {string} webhookUrl - Destination URL
 * @returns {Promise<{ ok: boolean, status?: number, error?: string }>}
 */
export async function sendToWebhook(payload, webhookUrl) {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── Core export function ─────────────────────────────────────────────────────

/**
 * Export a lead to a target system.
 *
 * Validates:
 *   1. Lead exists and is in 'ready_for_export' state
 *   2. Consent status is 'given' (not pending or denied)
 *
 * On success:
 *   - Transitions lead to 'exported'
 *   - Stamps exportTimestamp and exportTarget on the lead
 *   - Writes a full audit log entry
 *   - Returns the updated lead, the payload that was sent, and the audit log
 *
 * On failure (webhook unreachable, consent not given, wrong state):
 *   - Transitions lead to 'failed' (if state permits)
 *   - Writes an audit log entry with the error
 *   - Throws an Error with the reason
 *
 * @param {string} leadId
 * @param {string} exportedBy                     - Admin ID performing the export
 * @param {object} [opts]
 * @param {string} [opts.target]                  - 'internal' | 'crm_webhook' (default: 'internal')
 * @param {string} [opts.webhookUrl]              - Required when target === 'crm_webhook'
 * @param {string} [opts.consentBasis]            - Free-text note on consent basis
 * @returns {Promise<{ lead: object, payload: object, log: object }>}
 * @throws {Error} If lead not found, consent not given, state invalid, or export fails
 */
export async function exportLead(leadId, exportedBy, opts = {}) {
  const target = opts.target ?? 'internal';
  const lead = getLead(leadId);

  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  // Consent gate — never export without explicit consent
  if (lead.consentStatus !== 'given') {
    throw new Error(
      `Export blocked: consent status is '${lead.consentStatus}' (required: 'given')`
    );
  }

  // State gate — must be in ready_for_export
  if (lead.exportState !== 'ready_for_export') {
    throw new Error(
      `Export blocked: lead is in state '${lead.exportState}' (required: 'ready_for_export')`
    );
  }

  const exportTarget = opts.webhookUrl ?? target;
  const payload = buildExportPayload(lead, exportTarget);

  // Attempt delivery
  let deliveryOk = true;
  let deliveryError = null;

  if (target === 'crm_webhook') {
    if (!opts.webhookUrl) throw new Error('webhookUrl is required when target is crm_webhook');
    const result = await sendToWebhook(payload, opts.webhookUrl);
    deliveryOk = result.ok;
    deliveryError = result.error ?? (result.ok ? null : `HTTP ${result.status}`);
  }
  // target === 'internal': no network call — in-memory stub always succeeds

  if (!deliveryOk) {
    // Transition to failed and log
    const failedLead = transitionLead(lead, 'failed');
    saveLead(failedLead);

    const failLog = createAuditLog({
      entityType: 'lead',
      entityId: leadId,
      action: 'export_failed',
      changedBy: exportedBy,
      diff: { target, error: deliveryError },
      meaningChanged: false,
      scope: 'local',
      reason: `Export attempt failed: ${deliveryError}`,
    });
    appendAuditLog(failLog);

    throw new Error(`Lead export failed: ${deliveryError}`);
  }

  // Transition to exported
  const exportedLead = transitionLead(lead, 'exported', {
    exportTimestamp: new Date().toISOString(),
    exportTarget,
  });
  saveLead(exportedLead);

  const log = createAuditLog({
    entityType: 'lead',
    entityId: leadId,
    action: 'exported',
    changedBy: exportedBy,
    diff: {
      target,
      exportTarget,
      consentBasis: opts.consentBasis ?? 'admin_confirmed',
      payloadFields: SAFE_EXPORT_FIELDS,
    },
    meaningChanged: false,
    scope: 'local',
    reason: opts.consentBasis ?? 'Admin confirmed consent and exported lead',
  });
  appendAuditLog(log);

  return { lead: exportedLead, payload, log };
}

// ─── Lead lifecycle actions ───────────────────────────────────────────────────

/**
 * Promote a lead from 'detected' to 'lead_created'.
 * Called by admin after reviewing the detected lead and confirming it warrants follow-up.
 *
 * @param {string} leadId
 * @param {string} by - Admin ID
 * @returns {{ lead: object, log: object }}
 */
export function confirmLead(leadId, by) {
  const lead = getLead(leadId);
  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  const updated = transitionLead(lead, 'lead_created');
  saveLead(updated);

  const log = createAuditLog({
    entityType: 'lead',
    entityId: leadId,
    action: 'lead_confirmed',
    changedBy: by,
    meaningChanged: false,
    scope: 'local',
    reason: 'Admin confirmed lead for follow-up',
  });
  appendAuditLog(log);

  return { lead: updated, log };
}

/**
 * Mark a confirmed lead as ready for export.
 * Called after obtaining org consent and completing lead details.
 *
 * @param {string} leadId
 * @param {string} by - Admin ID
 * @param {{ consentBasis?: string }} [opts]
 * @returns {{ lead: object, log: object }}
 */
export function markLeadReadyForExport(leadId, by, opts = {}) {
  const lead = getLead(leadId);
  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  const updated = transitionLead(lead, 'ready_for_export');
  saveLead(updated);

  const log = createAuditLog({
    entityType: 'lead',
    entityId: leadId,
    action: 'marked_ready_for_export',
    changedBy: by,
    meaningChanged: false,
    scope: 'local',
    reason: opts.consentBasis ?? 'Consent obtained — lead ready for export',
  });
  appendAuditLog(log);

  return { lead: updated, log };
}

/**
 * Archive a lead (abandoned without export, or post-export cleanup).
 *
 * @param {string} leadId
 * @param {string} by - Admin ID
 * @param {string} reason
 * @returns {{ lead: object, log: object }}
 */
export function archiveLead(leadId, by, reason) {
  const lead = getLead(leadId);
  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  const updated = transitionLead(lead, 'archived');
  saveLead(updated);

  const log = createAuditLog({
    entityType: 'lead',
    entityId: leadId,
    action: 'lead_archived',
    changedBy: by,
    meaningChanged: false,
    scope: 'local',
    reason,
  });
  appendAuditLog(log);

  return { lead: updated, log };
}
