/**
 * ReviewApprovalStateMachine — FPP §9.2
 *
 * Governs the lifecycle of an admin review/approval workflow.
 */

export const REVIEW_STATES = {
  PENDING:    'pending',
  IN_REVIEW:  'in_review',
  APPROVED:   'approved',
  REJECTED:   'rejected',
  ESCALATED:  'escalated',
};

const TRANSITIONS = {
  pending:   ['in_review'],
  in_review: ['approved', 'rejected', 'escalated'],
  approved:  [],
  rejected:  ['in_review'],   // Can be re-reviewed after edits
  escalated: ['in_review', 'approved', 'rejected'],
};

export function isValidReviewTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * @param {{ state: string }} reviewItem
 * @param {string} toState
 * @param {Object} [opts]
 */
export function transitionReview(reviewItem, toState, opts = {}) {
  if (!isValidReviewTransition(reviewItem.state, toState)) {
    throw new Error(`Invalid review transition: ${reviewItem.state} → ${toState}`);
  }
  return { ...reviewItem, state: toState, ...opts };
}
