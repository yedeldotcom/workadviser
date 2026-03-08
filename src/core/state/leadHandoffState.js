/**
 * LeadHandoffStateMachine — FPP §9.2
 */

export const LEAD_STATES = {
  DETECTED:         'detected',
  LEAD_CREATED:     'lead_created',
  READY_FOR_EXPORT: 'ready_for_export',
  EXPORTED:         'exported',
  FAILED:           'failed',
  ARCHIVED:         'archived',
};

const TRANSITIONS = {
  detected:         ['lead_created'],
  lead_created:     ['ready_for_export', 'archived'],
  ready_for_export: ['exported', 'failed', 'archived'],
  exported:         ['archived'],
  failed:           ['ready_for_export', 'archived'],
  archived:         [],
};

export function isValidLeadTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * @param {import('../models/report.js').LeadObject} lead
 * @param {string} toState
 * @param {{ exportTimestamp?: string, exportTarget?: string }} [opts]
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
