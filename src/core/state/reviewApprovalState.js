/**
 * ReviewApprovalStateMachine — FPP §9.2
 *
 * Governs the lifecycle of an admin review/approval workflow item
 * (e.g. a rule suggestion, a substantive recommendation edit, or an escalated case).
 *
 * State flow:
 *   pending → in_review ──┬→ approved  (terminal)
 *                         ├→ rejected → in_review  (re-reviewable after edits)
 *                         └→ escalated → in_review | approved | rejected
 *
 * Usage:
 *   - 'pending'    = item created, waiting to be picked up by an admin
 *   - 'in_review'  = admin has opened the item and is reviewing it
 *   - 'approved'   = item accepted; terminal — no further changes
 *   - 'rejected'   = item declined; can be re-submitted for review after edits
 *   - 'escalated'  = flagged for senior review (system_owner or clinical authority)
 */

export const REVIEW_STATES = {
  PENDING:    'pending',
  IN_REVIEW:  'in_review',
  APPROVED:   'approved',
  REJECTED:   'rejected',
  ESCALATED:  'escalated',
};

/** @type {Record<string, string[]>} */
const TRANSITIONS = {
  pending:   ['in_review'],
  in_review: ['approved', 'rejected', 'escalated'],
  approved:  [],
  rejected:  ['in_review'],   // Can be re-reviewed after edits
  escalated: ['in_review', 'approved', 'rejected'],
};

/**
 * Check whether a review approval state transition is permitted.
 * @param {string} from - Current review state
 * @param {string} to   - Desired next state
 * @returns {boolean}
 */
export function isValidReviewTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Transition a review item to a new approval state.
 * Any additional fields in opts are merged into the returned object (e.g. assignedTo, resolvedAt).
 *
 * @param {{ state: string }} reviewItem
 * @param {string} toState
 * @param {Object} [opts] - Additional fields to merge into the updated item
 * @returns {{ state: string }}
 * @throws {Error} If the transition is not valid for the item's current state
 */
export function transitionReview(reviewItem, toState, opts = {}) {
  if (!isValidReviewTransition(reviewItem.state, toState)) {
    throw new Error(`Invalid review transition: ${reviewItem.state} → ${toState}`);
  }
  return { ...reviewItem, state: toState, ...opts };
}
