/**
 * LeadHandoffStateMachine — FPP §9.2
 *
 * Governs the export lifecycle of a LeadObject (lecture/org opportunity).
 *
 * State flow:
 *   detected → lead_created → ready_for_export → exported → archived
 *                                              ↘ failed → ready_for_export (retry)
 *                           → archived (abandoned without export)
 *
 * A lead is only exported when admin explicitly marks it — never automatic.
 * All export events are audit-logged (FPP §6.5).
 */

export const LEAD_STATES = {
  DETECTED:         'detected',
  LEAD_CREATED:     'lead_created',
  READY_FOR_EXPORT: 'ready_for_export',
  EXPORTED:         'exported',
  FAILED:           'failed',
  ARCHIVED:         'archived',
};

/** @type {Record<string, string[]>} */
const TRANSITIONS = {
  detected:         ['lead_created'],
  lead_created:     ['ready_for_export', 'archived'],
  ready_for_export: ['exported', 'failed', 'archived'],
  exported:         ['archived'],
  failed:           ['ready_for_export', 'archived'],
  archived:         [],
};

/**
 * Check whether a lead export state transition is permitted.
 * @param {string} from - Current export state
 * @param {string} to   - Desired next state
 * @returns {boolean}
 */
export function isValidLeadTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Transition a LeadObject to a new export state.
 * Automatically stamps exportTimestamp and exportTarget when entering 'exported'.
 *
 * @param {import('../models/report.js').LeadObject} lead
 * @param {string} toState
 * @param {{ exportTimestamp?: string, exportTarget?: string }} [opts]
 * @returns {import('../models/report.js').LeadObject}
 * @throws {Error} If the transition is not valid for the lead's current exportState
 */
export function transitionLead(lead, toState, opts = {}) {
  if (!isValidLeadTransition(lead.exportState, toState)) {
    throw new Error(`Invalid lead transition: ${lead.exportState} → ${toState}`);
  }

  const updated = { ...lead, exportState: toState };

  if (toState === 'exported') {
    updated.exportTimestamp = opts.exportTimestamp ?? new Date().toISOString();
    updated.exportTarget = opts.exportTarget ?? lead.exportTarget;
  }

  return updated;
}
